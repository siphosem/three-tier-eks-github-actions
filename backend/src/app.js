const express = require('express');

function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // Liveness: the process is up.
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Readiness: the database is reachable. Kubernetes stops routing here if not.
  app.get('/api/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'database unavailable' });
    }
  });

  app.get('/api/notes', async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 100'
      );
      res.json(rows);
    } catch (err) { next(err); }
  });

  app.post('/api/notes', async (req, res, next) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'text is required (1-500 characters)' });
    }
    try {
      // Parameterised query: no SQL injection.
      const { rows } = await pool.query(
        'INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at',
        [text]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  app.delete('/api/notes/:id', async (req, res, next) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'invalid id' });
    try {
      const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

module.exports = { createApp };
