export declare class ApiClientError extends Error {
    readonly code: string;
    readonly status: number;
    readonly retryable: boolean;
    readonly details?: unknown;
    constructor(input: {
        code: string;
        message: string;
        status: number;
        retryable: boolean;
        details?: unknown;
    });
}
export declare class ContractViolationError extends Error {
    readonly code = "CONTRACT_VIOLATION";
    readonly status = 500;
    readonly details?: unknown;
    constructor(message: string, details?: unknown);
}
//# sourceMappingURL=errors.d.ts.map