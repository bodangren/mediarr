import { z } from 'zod';

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const apiErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    retryable: z.boolean(),
    path: z.string().optional(),
  }),
});

export function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    ok: z.literal(true),
    data,
  });
}

export function paginatedEnvelopeSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    ok: z.literal(true),
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
