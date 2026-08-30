import { Router } from 'express';
import { checkDatabase } from '../db/database.js';

export const healthRouter = Router();

healthRouter.get('/', async (request, response) => {
  const database = await checkDatabase();

  response.json({
    data: {
      status: 'up',
      service: 'florea-haven-api',
      database,
      timestamp: new Date().toISOString(),
    },
  });
});
