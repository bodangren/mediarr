import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const healthSchema: z.ZodObject<{
    status: z.ZodUnion<[z.ZodLiteral<"critical">, z.ZodLiteral<"warning">, z.ZodLiteral<"ok">]>;
    indexers: z.ZodArray<z.ZodObject<{
        indexerId: z.ZodNumber;
        indexerName: z.ZodString;
        severity: z.ZodUnion<[z.ZodLiteral<"critical">, z.ZodLiteral<"warning">, z.ZodLiteral<"ok">]>;
        snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        indexerId: number;
        indexerName: string;
        severity: "ok" | "warning" | "critical";
        snapshot?: unknown;
    }, {
        indexerId: number;
        indexerName: string;
        severity: "ok" | "warning" | "critical";
        snapshot?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "ok" | "warning" | "critical";
    indexers: {
        indexerId: number;
        indexerName: string;
        severity: "ok" | "warning" | "critical";
        snapshot?: unknown;
    }[];
}, {
    status: "ok" | "warning" | "critical";
    indexers: {
        indexerId: number;
        indexerName: string;
        severity: "ok" | "warning" | "critical";
        snapshot?: unknown;
    }[];
}>;
export type HealthSnapshot = z.infer<typeof healthSchema>;
export declare function createHealthApi(client: ApiHttpClient): {
    get(): Promise<HealthSnapshot>;
};
export {};
//# sourceMappingURL=healthApi.d.ts.map