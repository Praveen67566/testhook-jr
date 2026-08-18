import express from 'express';
import helmet from 'helmet';

import { env } from './configs/env.js';

import leadRoutes from './routers/leadRoutes.js';
import healthRoutes from './routers/healthRoutes.js';
import eventRoutes from './routers/eventRoutes.js';

import {
  notFoundHandler,
  errorHandler,
} from './middlewares/error-handler.js';

const app = express();

app.disable('x-powered-by');

/*
 * Nginx is the only proxy directly in front
 * of this application.
 */
app.set(
  'trust proxy',
  env.TRUST_PROXY_HOPS === 0
    ? false
    : env.TRUST_PROXY_HOPS
);

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/*
 * Do NOT add:
 *
 * app.use(express.json())
 *
 * globally.
 *
 * JSON parsing is intentionally restricted
 * to the three POST lead routes.
 */

app.use(healthRoutes);
app.use(leadRoutes);
app.use(eventRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;