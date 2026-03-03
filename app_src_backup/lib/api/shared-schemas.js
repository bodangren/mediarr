import { z } from 'zod';
export const testResultSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    diagnostics: z.object({
        remediationHints: z.array(z.string()),
    }).optional(),
    healthSnapshot: z.unknown().nullable().optional(),
});
//# sourceMappingURL=shared-schemas.js.map