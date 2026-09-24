import { z } from 'zod';

function requiredString(maxLength, minLength = 1) {
  return z
    .string()
    .trim()
    .min(minLength, 'This field is required.')
    .max(maxLength, `Must be ${maxLength} characters or fewer.`);
}

function optionalString(maxLength) {
  return z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
          return undefined;
        }

        return trimmed;
      }

      return value;
    },
    z
      .string()
      .max(maxLength, `Must be ${maxLength} characters or fewer.`)
      .optional()
  );
}

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .pipe(
    z.email({
      error: 'Invalid email address.',
    })
  );

const pageParametersSchema = z
  .strictObject({
    utm_source: optionalString(500),
    utm_medium: optionalString(500),
    utm_campaign: optionalString(500),
  })
  .optional();

const nyifePageParametersSchema = z
  .strictObject({
    utm_source: optionalString(500),
    utm_medium: optionalString(500),
    utm_campaign: optionalString(500),
    utm_term: optionalString(500),
    utm_content: optionalString(500),
    fbclid: optionalString(1000),
    gclid: optionalString(1000),
  })
  .optional();

export const leadPayloadSchema = z.strictObject({
  name: requiredString(200),

  email: emailSchema,

  phone: requiredString(40, 5),

  message: optionalString(5000),

  page_name: optionalString(500),

  form_name: optionalString(200),

  source: optionalString(2048),

  responsible: optionalString(200),

  stage: optionalString(100),

  page_parameters: pageParametersSchema,
});

export const nyifeLeadPayloadSchema = z.strictObject({
  name: requiredString(200),

  email: emailSchema,

  phone: requiredString(40, 5),

  company: optionalString(500),

  plan: optionalString(200),

  demo_date: optionalString(50),

  demo_time: optionalString(50),

  page_name: optionalString(500),

  form_name: optionalString(200),

  source: optionalString(2048),

  page_parameters: nyifePageParametersSchema,
});
