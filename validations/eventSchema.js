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