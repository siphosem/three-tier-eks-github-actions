const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { newDb } = require('pg-mem');
const { createApp } = require('../src/app');
const { migrate } = require('../src/db');

let server;
let base;
let pool;

beforeEach(async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
  await migrate(pool);
  server = createApp(pool).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => server.close());

const post = (text) => fetch(`${base}/api/notes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
});

test('health and readiness', async () => {
  assert.strictEqual((await fetch(`${base}/api/health`)).status, 200);
  assert.strictEqual((await fetch(`${base}/api/ready`)).status, 200);
});

test('readiness fails when the database is down', async () => {
  server.close();
  const broken = { query: async () => { throw new Error('down'); } };
  server = createApp(broken).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  assert.strictEqual((await fetch(`${base}/api/ready`)).status, 503);
  assert.strictEqual((await fetch(`${base}/api/notes`)).status, 500);
});

test('create and list notes, newest first', async () => {
  assert.strictEqual((await post('first')).status, 201);
  await post('second');
  const notes = await (await fetch(`${base}/api/notes`)).json();
  assert.deepStrictEqual(notes.map((n) => n.text), ['second', 'first']);
});

test('rejects empty, oversized and non-string text', async () => {
  assert.strictEqual((await post('   ')).status, 400);
  assert.strictEqual((await post('x'.repeat(501))).status, 400);
  assert.strictEqual((await post(42)).status, 400);
});

test('stores SQL-like input as plain text', async () => {
  const evil = "'); DROP TABLE notes; --";
  const created = await (await post(evil)).json();
  assert.strictEqual(created.text, evil);
  assert.strictEqual((await fetch(`${base}/api/notes`)).status, 200);
});

test('delete a note', async () => {
  const { id } = await (await post('bye')).json();
  assert.strictEqual((await fetch(`${base}/api/notes/${id}`, { method: 'DELETE' })).status, 204);
  assert.strictEqual((await fetch(`${base}/api/notes/${id}`, { method: 'DELETE' })).status, 404);
  assert.strictEqual((await fetch(`${base}/api/notes/abc`, { method: 'DELETE' })).status, 400);
});
