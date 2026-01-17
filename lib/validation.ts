import { z } from 'zod';

export const urlSchema = z.string().url('Invalid URL');

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.errors[0];
    const message = first?.message || 'Invalid request';
    const path = first?.path?.join('.');
    return { ok: false, error: { message, path, issues: result.error.issues } };
  }
  return { ok: true, data: result.data };
}
