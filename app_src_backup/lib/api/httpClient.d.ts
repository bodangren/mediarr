import { z } from 'zod';
import { type PaginationMeta } from './schemas';
export interface ApiHttpClientConfig {
    baseUrl?: string;
    fetchFn?: typeof fetch;
    defaultHeaders?: Record<string, string>;
}
export interface RequestConfig {
    path: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    query?: object;
    headers?: Record<string, string>;
    onUploadProgress?: (progress: number) => void;
}
export interface PaginatedResult<T> {
    items: T[];
    meta: PaginationMeta;
}
export declare class ApiHttpClient {
    private readonly baseUrl;
    private readonly fetchFn?;
    private readonly defaultHeaders;
    constructor(config?: ApiHttpClientConfig);
    request<T>(config: RequestConfig, schema: z.ZodType<T>): Promise<T>;
    requestPaginated<T>(config: RequestConfig, itemSchema: z.ZodType<T>): Promise<PaginatedResult<T>>;
    requestBlob(config: RequestConfig): Promise<Blob>;
    private execute;
    private executeWithXhr;
}
//# sourceMappingURL=httpClient.d.ts.map