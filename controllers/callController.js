import {
  findCallEvents,
  insertCallEvent,
} from '../services/eventService.js';

import { callEventPayloadSchema } from '../validations/eventSchema.js';
import {
  createAdminPageUrl,
  createPagination,
  formatAdminDate,
  formatMetadata,
  parsePagination,
  shouldReturnAdminJson,
  toIsoDate,
} from '../utils/admin-view.js';

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

export async function createCallEvent(req, res, next) {
  try {
    const validation = callEventPayloadSchema.safeParse(
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

    const event = await insertCallEvent(
      validation.data,
      requestMetadata
    );

    return res.status(201).json({
      success: true,
      id: event.id,
      message: 'Call event received.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getCallEvents(req, res, next) {
  try {
    const { page, limit } = parsePagination(
      req.query
    );

    const { events, total } = await findCallEvents({
      page,
      limit,
    });

    const response = {
      success: true,
      page,
      limit,
      count: events.length,
      total,
      events,
    };

    res.vary('Accept');

    const returnJson = shouldReturnAdminJson(req);
    const lastPage = Math.max(
      Math.ceil(total / limit),
      1
    );

    if (!returnJson && page > lastPage) {
      return res.redirect(
        302,
        createAdminPageUrl(
          '/call',
          lastPage,
          limit,
          req.query.format === 'html'
            ? 'html'
            : undefined
        )
      );
    }

    if (returnJson) {
      return res.status(200).json(response);
    }

    return res.status(200).render('call', {
      ...response,
      pagination: createPagination({
        pathname: '/call',
        page,
        limit,
        total,
        count: events.length,
        format:
          req.query.format === 'html'
            ? 'html'
            : undefined,
      }),
      formatAdminDate,
      formatMetadata,
      toIsoDate,
    });
  } catch (error) {
    next(error);
  }
}
