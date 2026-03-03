import { z } from 'zod';
export declare const testResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    diagnostics: z.ZodOptional<z.ZodObject<{
        remediationHints: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        remediationHints: string[];
    }, {
        remediationHints: string[];
    }>>;
    healthSnapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    diagnostics?: {
        remediationHints: string[];
    } | undefined;
    healthSnapshot?: unknown;
}, {
    message: string;
    success: boolean;
    diagnostics?: {
        remediationHints: string[];
    } | undefined;
    healthSnapshot?: unknown;
}>;
export type TestResult = z.infer<typeof testResultSchema>;
//# sourceMappingURL=shared-schemas.d.ts.map