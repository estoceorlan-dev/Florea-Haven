import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const notFound = (request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route matches ${request.method} ${request.originalUrl}.`,
    },
  });
};

export const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid values.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const status = error.status ?? 500;
  const isServerError = status >= 500;

  if (isServerError && env.nodeEnv !== 'test') {
    console.error(error);
  }

  response.status(status).json({
    error: {
      code: error.code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message:
        isServerError && env.nodeEnv === 'production'
          ? 'Something went wrong while processing the request.'
          : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
