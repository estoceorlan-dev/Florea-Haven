import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { newDb } from 'pg-mem';
import { env, paths } from '../config/env.js';

let pool;
let databaseMode;

const readSql = (relativePath) =>
  fs.readFile(path.join(paths.serverRoot, relativePath), 'utf8');

const createMemoryPool = async () => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  const memoryPool = new adapter.Pool();

  const [catalogMigration, catalogSeed] = await Promise.all([
    readSql('migrations/001_catalog.sql'),
    readSql('seeds/catalog.sql'),
  ]);

  await memoryPool.query(catalogMigration);
  await memoryPool.query(catalogSeed);

  return memoryPool;
};

export const initializeDatabase = async () => {
  if (pool) return pool;

  if (env.useInMemoryDatabase) {
    pool = await createMemoryPool();
    databaseMode = 'memory';
  } else {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is required when USE_IN_MEMORY_DB is false.');
    }

    pool = new pg.Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
      max: env.nodeEnv === 'production' ? 10 : 5,
    });
    databaseMode = 'postgresql';
  }

  await pool.query('SELECT 1');
  return pool;
};

export const query = async (text, values = []) => {
  const activePool = await initializeDatabase();
  return activePool.query(text, values);
};

export const checkDatabase = async () => {
  const startedAt = performance.now();
  await query('SELECT 1 AS healthy');

  return {
    status: 'up',
    mode: databaseMode,
    responseTimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
};

export const closeDatabase = async () => {
  if (!pool) return;
  await pool.end();
  pool = undefined;
  databaseMode = undefined;
};
