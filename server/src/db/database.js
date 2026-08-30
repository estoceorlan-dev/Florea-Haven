import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { newDb } from 'pg-mem';
import { env, paths } from '../config/env.js';

let pool;
let databaseMode;
let memoryDatabase;
let memoryTransactionTail = Promise.resolve();

const readSqlDirectory = async (relativePath) => {
  const directory = path.join(paths.serverRoot, relativePath);
  const fileNames = (await fs.readdir(directory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  return Promise.all(
    fileNames.map((fileName) => fs.readFile(path.join(directory, fileName), 'utf8')),
  );
};

const createMemoryPool = async () => {
  memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  const memoryPool = new adapter.Pool();

  const [migrations, seeds] = await Promise.all([
    readSqlDirectory('migrations'),
    readSqlDirectory('seeds'),
  ]);

  for (const migration of migrations) {
    await memoryPool.query(migration);
  }

  for (const seed of seeds) {
    await memoryPool.query(seed);
  }

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

export const withTransaction = async (operation) => {
  const activePool = await initializeDatabase();

  if (databaseMode === 'memory') {
    const previousTransaction = memoryTransactionTail;
    let releaseTransaction;
    memoryTransactionTail = new Promise((resolve) => {
      releaseTransaction = resolve;
    });
    await previousTransaction;
    const backup = memoryDatabase.backup();

    try {
      return await operation((text, values = []) => activePool.query(text, values));
    } catch (error) {
      backup.restore();
      throw error;
    } finally {
      releaseTransaction();
    }
  }

  const client = await activePool.connect();

  try {
    await client.query('BEGIN');
    const result = await operation((text, values = []) => client.query(text, values));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  memoryDatabase = undefined;
  memoryTransactionTail = Promise.resolve();
};
