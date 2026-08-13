import express, { Router } from 'express';
import basicAuth from 'express-basic-auth';

import { env } from '../configs/env.js';

import { leadCors } from '../middlewares/cors.js';
import { leadRateLimiter } from '../middlewares/rate-limit.js';
import { requireJsonContentType } from '../middlewares/json-only.js';

import {
  createLeadHandler,
  getLeads,
} from '../controllers/leadController.js';

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

  router.options(
    path,
    leadCors
  );

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
 * Protect GET /leads only.
 */
const leadsBasicAuth = basicAuth({
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

  realm: 'JR Compliance Leads',

  unauthorizedResponse: {
    success: false,
    error: 'Unauthorized.',
  },
});

router.get(
  '/leads',
  leadsBasicAuth,
  getLeads
);

export default router;