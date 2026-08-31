import express, { Router } from 'express';

import { adminBasicAuth } from '../middlewares/admin-auth.js';
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
 * Admin endpoint
 *
 * Example:
 * GET /whatsapp?page=1&limit=20
 */
router.get(
  '/whatsapp',
  adminBasicAuth,
  getWhatsappEvents
);

export default router;
