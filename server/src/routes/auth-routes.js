import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/database.js';
import { authenticate } from '../middleware/auth-middleware.js';
import { verifyRequestOrigin } from '../middleware/origin-middleware.js';
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  normalizeEmail,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from '../services/auth-service.js';
import { HttpError } from '../utils/http-error.js';

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(254)
  .transform(normalizeEmail);

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(72, 'Password must contain no more than 72 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters.')
    .max(80, 'Name must contain no more than 80 characters.'),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

const invalidCredentials = () =>
  new HttpError(401, 'Invalid email or password.', undefined, 'INVALID_CREDENTIALS');

const dummyHash = hashPassword('not-a-real-password-987654');

export const authRouter = Router();

authRouter.post(
  '/register',
  verifyRequestOrigin,
  authRateLimit,
  async (request, response) => {
    const input = registerSchema.parse(request.body);
    const existingUser = await query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [
      input.email,
    ]);

    if (existingUser.rowCount > 0) {
      throw new HttpError(
        409,
        'An account with this email already exists.',
        undefined,
        'EMAIL_ALREADY_REGISTERED',
      );
    }

    const passwordHash = await hashPassword(input.password);
    let result;

    try {
      result = await query(
        `
          INSERT INTO users (id, name, email, password_hash, role)
          VALUES ($1, $2, $3, $4, 'customer')
          RETURNING id, name, email, role, created_at
        `,
        [randomUUID(), input.name, input.email, passwordHash],
      );
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpError(
          409,
          'An account with this email already exists.',
          undefined,
          'EMAIL_ALREADY_REGISTERED',
        );
      }

      throw error;
    }

    const user = publicUser(result.rows[0]);
    const token = await createSessionToken(user);
    setSessionCookie(response, token);

    response.status(201).json({ data: { user } });
  },
);

authRouter.post(
  '/login',
  verifyRequestOrigin,
  authRateLimit,
  async (request, response) => {
    const input = loginSchema.parse(request.body);
    const result = await query(
      `
        SELECT id, name, email, password_hash, role, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [input.email],
    );
    const user = result.rows[0];
    const passwordMatches = await verifyPassword(
      input.password,
      user?.password_hash ?? (await dummyHash),
    );

    if (!user || !passwordMatches) {
      throw invalidCredentials();
    }

    const safeUser = publicUser(user);
    const token = await createSessionToken(safeUser);
    setSessionCookie(response, token);

    response.json({ data: { user: safeUser } });
  },
);

authRouter.post('/logout', verifyRequestOrigin, (request, response) => {
  clearSessionCookie(response);
  response.json({ data: { signedOut: true } });
});

authRouter.get('/me', authenticate, (request, response) => {
  response.json({ data: { user: request.user } });
});
