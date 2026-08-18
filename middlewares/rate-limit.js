import { rateLimit } from 'express-rate-limit';
import { env } from '../configs/env.js';

function createWebhookRateLimiter() {
  return rateLimit({
    windowMs:
      env.LEADS_RATE_LIMIT_WINDOW_MS,

    limit:
      env.LEADS_RATE_LIMIT_MAX,

    standardHeaders: true,

    legacyHeaders: false,

    handler(
      req,
      res,
      next,
      options
    ) {
      return res
        .status(options.statusCode)
        .json({
          success: false,
          error:
            'Too many requests. Please try again later.',
        });
    },
  });
}

export const leadRateLimiter =
  createWebhookRateLimiter();

export const eventRateLimiter =
  createWebhookRateLimiter();