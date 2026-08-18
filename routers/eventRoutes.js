import express, { Router } from 'express';
import basicAuth from 'express-basic-auth';

import { env } from '../configs/env.js';

import { leadCors } from '../middlewares/cors.js';
import { eventRateLimiter } from '../middlewares/rate-limit.js';
import { requireJsonContentType } from '../middlewares/json-only.js';

import {
  createWhatsappEvent,
  getWhatsappEvents,
} from '../controllers/eventController.js';

const router = Router();

const jsonParser = express.json({
  limit: '16kb',
  type: 'application/json',
  strict: true,
});

/*
 * Handle CORS preflight for POST /whatsapp
 */
router.options(
  '/whatsapp',
  leadCors
);

/*
 * Public endpoint
 * Used by frontend before redirecting user to WhatsApp.
 */
router.post(
  '/whatsapp',
  leadCors,
  eventRateLimiter,
  requireJsonContentType,
  jsonParser,
  createWhatsappEvent
);

/*
 * Protect GET /whatsapp using the same credentials
 * used by GET /leads.
 */
const whatsappBasicAuth = basicAuth({
  authorizer: (username, password) => {
    const usernameMatches =
      basicAuth.safeCompare(
        username,
        env.LEADS_ADMIN_USERNAME
      );

    const passwordMatches =
      basicAuth.safeCompare(
        password,
        env.LEADS_ADMIN_PASSWORD
      );

    return usernameMatches && passwordMatches;
  },

  challenge: true,

  realm: 'JR Compliance WhatsApp Events',

  unauthorizedResponse: {
    success: false,
    error: 'Unauthorized.',
  },
});

/*
 * Admin endpoint
 *
 * Example:
 * GET /whatsapp?page=1&limit=20
 */
router.get(
  '/whatsapp',
  whatsappBasicAuth,
  getWhatsappEvents
);

export default router;