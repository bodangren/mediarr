import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { TestResult } from './shared-schemas';
declare const downloadClientSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    implementation: z.ZodString;
    configContract: z.ZodString;
    settings: z.ZodString;
    protocol: z.ZodString;
    host: z.ZodString;
    port: z.ZodNumber;
    category: z.ZodNullable<z.ZodString>;
    priority: z.ZodNumber;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: string;
    settings: string;
    id: number;
    implementation: string;
    protocol: string;
    enabled: boolean;
    priority: number;
    configContract: string;
    host: string;
    port: number;
    category: string | null;
}, {
    name: string;
    settings: string;
    id: number;
    implementation: string;
    protocol: string;
    enabled: boolean;
    priority: number;
    configContract: string;
    host: string;
    port: number;
    category: string | null;
}>;
export type DownloadClientItem = z.infer<typeof downloadClientSchema>;
export interface CreateDownloadClientInput {
    name: string;
    implementation: string;
    configContract: string;
    settings: string;
    protocol: string;
    host: string;
    port: number;
    category?: string;
    priority?: number;
    enabled?: boolean;
}
export type DownloadClientTestResult = TestResult;
export declare function createDownloadClientApi(client: ApiHttpClient): {
    list: any;
    create: any;
    update: any;
    remove: any;
    test: any;
    testDraft: any;
};
export {};
//# sourceMappingURL=downloadClientsApi.d.ts.map