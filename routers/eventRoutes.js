import express, { Router } from 'express';

import { adminBasicAuth } from '../middlewares/admin-auth.js';
import { leadCors } from '../middlewares/cors.js';
import { eventRateLimiter } from '../middlewares/rate-limit.js';
import { requireJsonContentType } from '../middlewares/json-only.js';

import {
  createWhatsappEvent,
  getWhatsappEvents,
} from '../controllers/eventController.js';
import {
  createCallEvent,
  getCallEvents,
} from '../controllers/callController.js';

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

router.options(
  '/call',
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
 * Public endpoint used by the frontend when a user clicks a phone link.
 */
router.post(
  '/call',
  leadCors,
  eventRateLimiter,
  requireJsonContentType,
  jsonParser,
  createCallEvent
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

/*
 * Admin endpoint
 *
 * Example:
 * GET /call?page=1&limit=20
 */
router.get(
  '/call',
  adminBasicAuth,
  getCallEvents
);

export default router;
