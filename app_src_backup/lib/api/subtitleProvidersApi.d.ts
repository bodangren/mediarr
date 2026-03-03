import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const providerSettingsSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    useSSL: z.ZodOptional<z.ZodBoolean>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    useSSL: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    useSSL: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">>;
declare const subtitleProviderSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodBoolean;
    type: z.ZodString;
    settings: z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>;
    lastError: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "error", "disabled"]>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodBoolean;
    type: z.ZodString;
    settings: z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>;
    lastError: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "error", "disabled"]>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodBoolean;
    type: z.ZodString;
    settings: z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        maxResults: z.ZodOptional<z.ZodNumber>;
        useSSL: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>;
    lastError: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "error", "disabled"]>;
}, z.ZodTypeAny, "passthrough">>;
declare const providerTestResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
}, {
    message: string;
    success: boolean;
}>;
export type SubtitleProvider = z.infer<typeof subtitleProviderSchema>;
export type ProviderSettings = z.infer<typeof providerSettingsSchema>;
export type ProviderTestResult = z.infer<typeof providerTestResultSchema>;
export declare function createSubtitleProvidersApi(client: ApiHttpClient): {
    /**
     * List all configured subtitle providers
     */
    listProviders(): Promise<SubtitleProvider[]>;
    /**
     * Get a specific subtitle provider by ID
     */
    getProvider(id: string): Promise<SubtitleProvider>;
    /**
     * Update a subtitle provider's settings
     */
    updateProvider(id: string, settings: ProviderSettings): Promise<SubtitleProvider>;
    /**
     * Test a subtitle provider connection
     */
    testProvider(id: string): Promise<ProviderTestResult>;
    /**
     * Reset a subtitle provider to default settings
     */
    resetProvider(id: string): Promise<SubtitleProvider>;
};
export {};
//# sourceMappingURL=subtitleProvidersApi.d.ts.map