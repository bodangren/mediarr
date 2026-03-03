import { ApiHttpClient } from './httpClient';
import type { CustomFormat, CreateCustomFormatInput, UpdateCustomFormatInput, CustomFormatTestResult, CustomFormatSchemaInfo } from '@/types/customFormat';
export declare function createCustomFormatApi(client: ApiHttpClient): {
    /**
     * Get all custom formats
     */
    list(): Promise<CustomFormat[]>;
    /**
     * Get a single custom format by ID
     */
    get(id: number): Promise<CustomFormat>;
    /**
     * Create a new custom format
     */
    create(input: CreateCustomFormatInput): Promise<CustomFormat>;
    /**
     * Update an existing custom format
     */
    update(id: number, input: UpdateCustomFormatInput): Promise<CustomFormat>;
    /**
     * Delete a custom format
     */
    delete(id: number): Promise<{
        id: number;
    }>;
    /**
     * Test a custom format against a sample release
     */
    test(id: number, release: {
        title: string;
        size?: number;
        language?: string;
        releaseGroup?: string;
        source?: string;
        resolution?: number;
        indexerFlags?: string[];
    }): Promise<CustomFormatTestResult>;
    /**
     * Get the custom format schema (valid condition types, operators, fields)
     */
    getSchema(): Promise<CustomFormatSchemaInfo>;
};
//# sourceMappingURL=customFormatApi.d.ts.map