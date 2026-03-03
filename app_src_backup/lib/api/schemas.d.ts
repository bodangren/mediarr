import { z } from 'zod';
export declare const paginationMetaSchema: z.ZodObject<{
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    totalCount: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
}, {
    page: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
}>;
export declare const apiErrorEnvelopeSchema: z.ZodObject<{
    ok: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
        retryable: z.ZodBoolean;
        path: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        retryable: boolean;
        details?: unknown;
        path?: string | undefined;
    }, {
        code: string;
        message: string;
        retryable: boolean;
        details?: unknown;
        path?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        retryable: boolean;
        details?: unknown;
        path?: string | undefined;
    };
    ok: false;
}, {
    error: {
        code: string;
        message: string;
        retryable: boolean;
        details?: unknown;
        path?: string | undefined;
    };
    ok: false;
}>;
export declare function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T): z.ZodObject<{
    ok: z.ZodLiteral<true>;
    data: T;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    ok: z.ZodLiteral<true>;
    data: T;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    ok: z.ZodLiteral<true>;
    data: T;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare function paginatedEnvelopeSchema<T extends z.ZodTypeAny>(item: T): z.ZodObject<{
    ok: z.ZodLiteral<true>;
    data: z.ZodArray<T, "many">;
    meta: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        totalCount: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        page: number;
        totalPages: number;
        pageSize: number;
        totalCount: number;
    }, {
        page: number;
        totalPages: number;
        pageSize: number;
        totalCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    data: T["_output"][];
    meta: {
        page: number;
        totalPages: number;
        pageSize: number;
        totalCount: number;
    };
}, {
    ok: true;
    data: T["_input"][];
    meta: {
        page: number;
        totalPages: number;
        pageSize: number;
        totalCount: number;
    };
}>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
//# sourceMappingURL=schemas.d.ts.map