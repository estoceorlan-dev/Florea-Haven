import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDirectory, '../..');
const repositoryRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(repositoryRoot, '.env') });
dotenv.config({ path: path.join(serverRoot, '.env'), override: true });

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: toBoolean(process.env.DATABASE_SSL),
  useInMemoryDatabase: toBoolean(
    process.env.USE_IN_MEMORY_DB,
    !process.env.DATABASE_URL,
  ),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? undefined
      : randomBytes(48).toString('base64url')),
  sessionDays: Number(process.env.SESSION_DAYS ?? 7),
};

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required in production.');
}

if (!Number.isInteger(env.sessionDays) || env.sessionDays < 1 || env.sessionDays > 30) {
  throw new Error('SESSION_DAYS must be an integer between 1 and 30.');
}

export const paths = {
  serverRoot,
  repositoryRoot,
};
