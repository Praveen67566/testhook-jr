import {
  findNyifeLeads,
  insertNyifeLead,
} from '../services/leadService.js';

import { nyifeLeadPayloadSchema } from '../validations/leadSchema.js';
import {
  createAdminPageUrl,
  createPagination,
  formatAdminDate,
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

export async function createNyifeLead(req, res, next) {
  try {
    const validation = nyifeLeadPayloadSchema.safeParse(
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

    const lead = await insertNyifeLead(validation.data);

    return res.status(201).json({
      success: true,
      id: lead.id,
      message: 'Nyife lead received.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getNyifeLeads(req, res, next) {
  try {
    const { page, limit } = parsePagination(
      req.query
    );

    const { leads, total } = await findNyifeLeads({
      page,
      limit,
    });

    const response = {
      success: true,
      page,
      limit,
      count: leads.length,
      total,
      leads,
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
          '/nyife/leads',
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

    return res.status(200).render('nyife-leads', {
      ...response,
      pagination: createPagination({
        pathname: '/nyife/leads',
        page,
        limit,
        total,
        count: leads.length,
        format:
          req.query.format === 'html'
            ? 'html'
            : undefined,
      }),
      formatAdminDate,
      toIsoDate,
    });
  } catch (error) {
    next(error);
  }
}
