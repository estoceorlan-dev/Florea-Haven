import { query } from '../db/database.js';
import {
  publicUser,
  sessionCookieName,
  verifySessionToken,
} from '../services/auth-service.js';
import { HttpError } from '../utils/http-error.js';

const authenticationError = () =>
  new HttpError(
    401,
    'Authentication is required to access this resource.',
    undefined,
    'AUTHENTICATION_REQUIRED',
  );

const getRequestToken = (request) => {
  if (request.cookies?.[sessionCookieName]) {
    return request.cookies[sessionCookieName];
  }

  const authorization = request.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
};

export const authenticate = async (request, response, next) => {
  const token = getRequestToken(request);

  if (!token) {
    next(authenticationError());
    return;
  }

  try {
    const payload = await verifySessionToken(token);

    if (!payload.sub) {
      next(authenticationError());
      return;
    }

    const result = await query(
      `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [payload.sub],
    );

    if (!result.rows[0]) {
      next(authenticationError());
      return;
    }

    request.user = publicUser(result.rows[0]);
    next();
  } catch {
    next(authenticationError());
  }
};

export const requireAdmin = (request, response, next) => {
  if (request.user?.role !== 'admin') {
    next(
      new HttpError(
        403,
        'Administrator access is required.',
        undefined,
        'ADMIN_ACCESS_REQUIRED',
      ),
    );
    return;
  }

  next();
};

export const requireCustomer = (request, response, next) => {
  if (request.user?.role !== 'customer') {
    next(
      new HttpError(
        403,
        'Customer access is required.',
        undefined,
        'CUSTOMER_ACCESS_REQUIRED',
      ),
    );
    return;
  }

  next();
};
