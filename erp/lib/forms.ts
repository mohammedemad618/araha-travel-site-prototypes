import { z } from 'zod';
import { isISODate } from './dates';

/** Result returned by every server action, shown by <FormStatus>. */
export type ActionResult =
  | { ok: true; message?: string; redirect?: string; data?: Record<string, unknown> }
  | { ok: false; error: string; fields?: Record<string, string> };

export const initialResult: ActionResult | null = null;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData → plain object (repeated keys become arrays). */
export function formObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string') continue;
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else out[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

// Shared field schemas. Messages are i18n keys, translated by the form.
export const text = (max = 200) => z.string().trim().min(1, 'required').max(max, 'tooLong');
export const optText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, 'tooLong')
    .optional()
    .transform((v) => (v ? v : undefined));
export const optDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isISODate(v), 'invalidDate')
  .transform((v) => (v ? v : undefined));
export const reqDate = z.string().trim().refine(isISODate, 'invalidDate');
export const intField = (min = 0, max = 100000) =>
  z.coerce
    .number({ invalid_type_error: 'invalidNumber' })
    .int('invalidNumber')
    .min(min, 'tooSmall')
    .max(max, 'tooLarge');
export const optEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, 'invalidEmail')
  .transform((v) => (v ? v : undefined));

/**
 * Builds a MongoDB update from form fields: values are $set, and fields the
 * user cleared (undefined) are $unset so old values do not linger.
 */
export function toUpdate(
  fields: Record<string, unknown>,
  prefix = '',
): { $set: Record<string, unknown>; $unset?: Record<string, ''> } {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) $unset[`${prefix}${k}`] = '';
    else $set[`${prefix}${k}`] = v;
  }
  return Object.keys($unset).length ? { $set, $unset } : { $set };
}
