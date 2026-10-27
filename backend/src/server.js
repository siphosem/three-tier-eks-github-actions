const { createApp } = require('./app');
const { poolFromEnv, migrate } = require('./db');

const port = Number(process.env.PORT) || 8080;
const pool = poolFromEnv();

async function main() {
  // Retry so pods started before the DB is reachable don't crash-loop.
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate(pool);
      break;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.warn(`DB not ready (attempt ${attempt}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const server = createApp(pool).listen(port, () => console.log(`notes-api on :${port}`));
  process.on('SIGTERM', () => server.close(() => pool.end().then(() => process.exit(0))));
}

main().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
