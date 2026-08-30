import { createPersistentPool, readSqlFiles } from './migration-utils.js';

const pool = createPersistentPool();

try {
  const seedFiles = await readSqlFiles('seeds');

  for (const seedFile of seedFiles) {
    await pool.query(seedFile.sql);
    console.log(`Loaded ${seedFile.name}`);
  }
} finally {
  await pool.end();
}
