import express, { Router } from 'express';

import { leadCors } from '../middlewares/cors.js';
import { leadRateLimiter } from '../middlewares/rate-limit.js';
import { requireJsonContentType } from '../middlewares/json-only.js';

import { createLeadHandler, getLeads } from '../controllers/leadController.js';

const router = Router();

const jsonParser = express.json({
  limit: '16kb',
  type: 'application/json',
  strict: true,
});

const leadTypes = [
  'corporate',
  'technical',
  'global',
];

for (const leadType of leadTypes) {
  const path = `/${leadType}`;

  /*
   * Browser CORS preflight.
   */
  router.options(
    path,
    leadCors
  );

  /*
   * Actual lead submission.
   */
  router.post(
    path,
    leadCors,
    leadRateLimiter,
    requireJsonContentType,
    jsonParser,
    createLeadHandler(leadType)
  );
}


/*
 * Get stored leads.
 *
 * Ideally keep this internal/admin-only because
 * it returns names, emails and phone numbers.
 */
router.get(
  '/leads',
  getLeads
);

export default router;