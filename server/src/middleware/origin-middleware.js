import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const verifyRequestOrigin = (request, response, next) => {
  const origin = request.get('origin');

  if (origin && origin !== env.clientOrigin) {
    next(
      new HttpError(
        403,
        'This request origin is not allowed.',
        undefined,
        'ORIGIN_NOT_ALLOWED',
      ),
    );
    return;
  }

  next();
};
