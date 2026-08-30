import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';

const secretKey = new TextEncoder().encode(env.jwtSecret);
const passwordCost = 12;

export const sessionCookieName = 'florea_session';

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
});

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const hashPassword = (password) => bcrypt.hash(password, passwordCost);

export const verifyPassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash);

export const createSessionToken = async (
  user,
  { expirationTime = `${env.sessionDays}d` } = {},
) =>
  new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secretKey);

export const verifySessionToken = async (token) => {
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ['HS256'],
  });

  return payload;
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
};

export const setSessionCookie = (response, token) => {
  response.cookie(sessionCookieName, token, sessionCookieOptions);
};

export const clearSessionCookie = (response) => {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
};
