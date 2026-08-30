import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, initializeDatabase } from './db/database.js';

await initializeDatabase();

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`Floréa Haven API listening on http://localhost:${env.port}`);
});

const shutDown = async () => {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
