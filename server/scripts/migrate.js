import { createPersistentPool, readSqlFiles } from './migration-utils.js';

const pool = createPersistentPool();
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrations = await readSqlFiles('migrations');

  for (const migration of migrations) {
    const existing = await client.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [migration.name],
    );

    if (existing.rowCount > 0) {
      console.log(`Skipped ${migration.name}`);
      continue;
    }

    await client.query('BEGIN');

    try {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
        migration.name,
      ]);
      await client.query('COMMIT');
      console.log(`Applied ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
