import {
  insertLead,
  findLeads,
} from '../services/leadService.js';

import { leadPayloadSchema } from '../validations/leadSchema.js';

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

export function createLeadHandler(leadType) {
  return async function handleLead(req, res, next) {
    try {
      const validation = leadPayloadSchema.safeParse(
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

      const lead = await insertLead(
        leadType,
        validation.data
      );

      return res.status(201).json({
        success: true,
        id: lead.id,
        message: 'Lead received.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export async function getLeads(req, res, next) {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page ?? '1', 10),
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit ?? '20', 10),
        1
      ),
      100
    );

    const leads = await findLeads({
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      count: leads.length,
      leads,
    });
  } catch (error) {
    next(error);
  }
}