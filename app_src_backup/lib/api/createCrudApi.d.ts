import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { TestResult } from './shared-schemas';
export interface CrudApiConfig<TItem, TCreate> {
    basePath: string;
    itemSchema: z.ZodType<TItem>;
    listSchema?: z.ZodType<TItem[]>;
}
export declare function createCrudApi<TItem, TCreate>(client: ApiHttpClient, config: CrudApiConfig<TItem, TCreate>): {
    list(): Promise<TItem[]>;
    create(input: TCreate): Promise<TItem>;
    update(id: number, input: Partial<TCreate>): Promise<TItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
    test(id: number): Promise<TestResult>;
    testDraft(input: TCreate): Promise<TestResult>;
};
//# sourceMappingURL=createCrudApi.d.ts.map