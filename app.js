import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './configs/env.js';

import leadRoutes from './routers/leadRoutes.js';
import healthRoutes from './routers/healthRoutes.js';
import eventRoutes from './routers/eventRoutes.js';

import {
  notFoundHandler,
  errorHandler,
} from './middlewares/error-handler.js';

const app = express();
const applicationDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set(
  'views',
  path.join(applicationDirectory, 'views')
);

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

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests':
          env.NODE_ENV === 'development'
            ? null
            : [],
      },
    },
  })
);

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(
  '/admin-assets',
  express.static(
    path.join(applicationDirectory, 'public'),
    {
      fallthrough: true,
      index: false,
    }
  )
);

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
