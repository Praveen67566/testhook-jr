import cors from 'cors';
import { env } from '../configs/env.js';

const allowedOrigins = new Set(env.LEADS_ALLOWED_ORIGINS);

const corsOptions = {
  origin(origin, callback) {
    /*
     * Requests such as curl/server-to-server calls can have no Origin.
     * CORS is a browser mechanism, so we allow the request without
     * adding an Access-Control-Allow-Origin header.
     */
    if (!origin) {
      return callback(null, false);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin not allowed.');

    error.code = 'CORS_NOT_ALLOWED';

    return callback(error);
  },

  methods: ['POST', 'OPTIONS'],

  allowedHeaders: ['Content-Type'],

  credentials: false,

  optionsSuccessStatus: 204,

  maxAge: 600,
};

export const leadCors = cors(corsOptions);