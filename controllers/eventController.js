import {
  insertWhatsappEvent,
  findWhatsappEvents,
} from '../services/eventService.js';

import { whatsappEventPayloadSchema } from '../validations/eventSchema.js';

function formatValidationErrors(error) {
  const fields = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'body';

    if (!fields[field]) {
      fields[field] = issue.message;
    }
  }

  return fields;
}

export async function createWhatsappEvent(req, res, next) {
  try {
    const validation = whatsappEventPayloadSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data.',
        fields: formatValidationErrors(
          validation.error
        ),
      });
    }

    /*
     * Request information that can be useful
     * for understanding where the WhatsApp
     * click came from.
     *
     * We intentionally do not store:
     * - cookies
     * - authorization headers
     */
    const requestMetadata = {
      ip: req.ip ?? null,

      user_agent:
        req.get('user-agent') ?? null,

      referrer:
        req.get('referer') ?? null,

      origin:
        req.get('origin') ?? null,

      accept_language:
        req.get('accept-language') ?? null,
    };

    const event = await insertWhatsappEvent(
      validation.data,
      requestMetadata
    );

    return res.status(201).json({
      success: true,
      id: event.id,
      message: 'WhatsApp event received.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getWhatsappEvents(
  req,
  res,
  next
) {
  try {
    let page = Number.parseInt(
      req.query.page ?? '1',
      10
    );

    let limit = Number.parseInt(
      req.query.limit ?? '20',
      10
    );

    /*
     * Prevent invalid pagination values such as:
     *
     * ?page=abc
     * ?limit=xyz
     */
    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 20;
    }

    /*
     * Do not allow extremely large responses.
     */
    limit = Math.min(limit, 100);

    const events = await findWhatsappEvents({
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
}