import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-middleware.js';
import { categoryRouter } from './routes/category-routes.js';
import { healthRouter } from './routes/health-routes.js';
import { productRouter } from './routes/product-routes.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.clientOrigin,
      methods: ['GET', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.use('/api/health', healthRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/products', productRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
