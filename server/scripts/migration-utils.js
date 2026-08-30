import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { env, paths } from '../src/config/env.js';

export const createPersistentPool = () => {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for migration and seed commands.');
  }

  return new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  });
};

export const readSqlFiles = async (directoryName) => {
  const directory = path.join(paths.serverRoot, directoryName);
  const fileNames = (await fs.readdir(directory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => ({
      name: fileName,
      sql: await fs.readFile(path.join(directory, fileName), 'utf8'),
    })),
  );
};
