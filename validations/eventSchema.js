import { z } from 'zod';

function requiredString(maxLength) {
  return z
    .string()
    .trim()
    .min(1, 'This field is required.')
    .max(
      maxLength,
      `Must be ${maxLength} characters or fewer.`
    );
}

const metadataSchema = z
  .record(
    z.string(),
    z.unknown()
  )
  .optional();

export const whatsappEventPayloadSchema =
  z.strictObject({
    event_info: requiredString(500),

    page_name: requiredString(500),

    text: requiredString(5000),

    metadata: metadataSchema,
  });

export const callEventPayloadSchema =
  z.strictObject({
    event_info: z.literal('call_click'),

    page_name: requiredString(500),

    text: requiredString(5000),

    metadata: z.strictObject({
      button_location: z.enum([
        'navbar',
        'navbar_mobile',
      ]),

      page_url: requiredString(5000),

      pathname: requiredString(2000),

      phone_number: requiredString(100),

      utm_source: requiredString(500).optional(),

      utm_medium: requiredString(500).optional(),

      utm_campaign: requiredString(500).optional(),
    }),
  });
