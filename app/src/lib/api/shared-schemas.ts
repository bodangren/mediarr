import { z } from 'zod';

export const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  diagnostics: z.object({
    remediationHints: z.array(z.string()),
  }).optional(),
  healthSnapshot: z.unknown().nullable().optional(),
});

export type TestResult = z.infer<typeof testResultSchema>;
