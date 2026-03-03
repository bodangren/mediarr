import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const appProfileSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    enableRss: z.ZodBoolean;
    enableInteractiveSearch: z.ZodBoolean;
    enableAutomaticSearch: z.ZodBoolean;
    minimumSeeders: z.ZodNumber;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    enableRss: boolean;
    enableInteractiveSearch: boolean;
    enableAutomaticSearch: boolean;
    minimumSeeders: number;
    createdAt?: string | Date | undefined;
    updatedAt?: string | Date | undefined;
}, {
    name: string;
    id: number;
    enableRss: boolean;
    enableInteractiveSearch: boolean;
    enableAutomaticSearch: boolean;
    minimumSeeders: number;
    createdAt?: string | Date | undefined;
    updatedAt?: string | Date | undefined;
}>;
export type AppProfileItem = z.infer<typeof appProfileSchema>;
export interface AppProfileInput {
    name: string;
    enableRss?: boolean;
    enableInteractiveSearch?: boolean;
    enableAutomaticSearch?: boolean;
    minimumSeeders?: number;
}
export declare function createAppProfilesApi(client: ApiHttpClient): {
    list(): Promise<AppProfileItem[]>;
    create(input: AppProfileInput): Promise<AppProfileItem>;
    update(id: number, input: Partial<AppProfileInput>): Promise<AppProfileItem>;
    remove(id: number): Promise<{
        id: number;
    }>;
    clone(id: number): Promise<AppProfileItem>;
};
export {};
//# sourceMappingURL=appProfilesApi.d.ts.map