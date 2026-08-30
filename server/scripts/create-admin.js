import { randomUUID } from 'node:crypto';
import { createPersistentPool } from './migration-utils.js';
import { hashPassword, normalizeEmail } from '../src/services/auth-service.js';

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL
  ? normalizeEmail(process.env.ADMIN_EMAIL)
  : undefined;
const password = process.env.ADMIN_PASSWORD;

if (!name || name.length < 2 || name.length > 80) {
  throw new Error('ADMIN_NAME must contain between 2 and 80 characters.');
}

if (!email || !email.includes('@')) {
  throw new Error('ADMIN_EMAIL must be a valid email address.');
}

if (
  !password ||
  password.length < 8 ||
  password.length > 72 ||
  !/[A-Za-z]/.test(password) ||
  !/[0-9]/.test(password)
) {
  throw new Error(
    'ADMIN_PASSWORD must contain 8–72 characters, including a letter and number.',
  );
}

const passwordHash = await hashPassword(password);
const pool = createPersistentPool();

try {
  await pool.query(
    `
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'admin')
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        updated_at = CURRENT_TIMESTAMP
    `,
    [randomUUID(), name, email, passwordHash],
  );

  console.log(`Administrator account ready for ${email}.`);
} finally {
  await pool.end();
}
