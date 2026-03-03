import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const categorySettingsSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    minSize: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxSize: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    description?: string | null | undefined;
    minSize?: number | null | undefined;
    maxSize?: number | null | undefined;
}, {
    name: string;
    id: number;
    description?: string | null | undefined;
    minSize?: number | null | undefined;
    maxSize?: number | null | undefined;
}>, {
    id: number;
    name: string;
    description: string | undefined;
    minSize: number | undefined;
    maxSize: number | undefined;
}, {
    name: string;
    id: number;
    description?: string | null | undefined;
    minSize?: number | null | undefined;
    maxSize?: number | null | undefined;
}>;
export type CategorySettingsItem = z.infer<typeof categorySettingsSchema>;
export interface CategorySettingsInput {
    name: string;
    description?: string;
    minSize?: number;
    maxSize?: number;
}
export declare function createCategorySettingsApi(client: ApiHttpClient): {
    list(): Promise<CategorySettingsItem[]>;
    create(input: CategorySettingsInput): Promise<CategorySettingsItem>;
    update(id: number, input: Partial<CategorySettingsInput>): Promise<CategorySettingsItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
};
export {};
//# sourceMappingURL=categorySettingsApi.d.ts.map