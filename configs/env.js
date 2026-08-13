import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(7146),

  HOST: z.string().min(1).default('127.0.0.1'),

  LEADS_DB_HOST: z.string().min(1),

  LEADS_DB_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5432),

  LEADS_DB_NAME: z.string().min(1),

  LEADS_DB_USER: z.string().min(1),

  LEADS_DB_PASSWORD: z.string().min(16),

  LEADS_ALLOWED_ORIGINS: z.string().min(1),

  LEADS_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(10),

  LEADS_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60000),

  TRUST_PROXY_HOPS: z.coerce
    .number()
    .int()
    .min(0)
    .max(10)
    .default(1),

  LEADS_ADMIN_USERNAME: z
  .string()
  .min(3)
  .max(100),

  LEADS_ADMIN_PASSWORD: z
  .string()
  .min(16)
  .max(200),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration:');

  for (const issue of result.error.issues) {
    console.error(
      `${issue.path.join('.') || 'environment'}: ${issue.message}`
    );
  }

  process.exit(1);
}

const allowedOrigins = result.data.LEADS_ALLOWED_ORIGINS
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.error('LEADS_ALLOWED_ORIGINS must contain at least one origin.');
  process.exit(1);
}

export const env = Object.freeze({
  ...result.data,
  LEADS_ALLOWED_ORIGINS: allowedOrigins,
});