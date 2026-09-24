import express, { Router } from 'express';

import { adminBasicAuth } from '../middlewares/admin-auth.js';
import { leadCors } from '../middlewares/cors.js';
import { leadRateLimiter } from '../middlewares/rate-limit.js';
import { requireJsonContentType } from '../middlewares/json-only.js';

import {
  createLeadHandler,
  getLeads,
} from '../controllers/leadController.js';
import {
  createNyifeLead,
  getNyifeLeads,
} from '../controllers/nyifeLeadController.js';

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

router.options(
  '/lead',
  leadCors
);

router.post(
  '/lead',
  leadCors,
  leadRateLimiter,
  requireJsonContentType,
  jsonParser,
  createNyifeLead
);

router.get(
  '/leads',
  adminBasicAuth,
  getLeads
);

router.get(
  '/nyife/leads',
  adminBasicAuth,
  getNyifeLeads
);

export default router;
