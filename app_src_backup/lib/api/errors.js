export class ApiClientError extends Error {
    code;
    status;
    retryable;
    details;
    constructor(input) {
        super(input.message);
        this.name = 'ApiClientError';
        this.code = input.code;
        this.status = input.status;
        this.retryable = input.retryable;
        this.details = input.details;
    }
}
export class ContractViolationError extends Error {
    code = 'CONTRACT_VIOLATION';
    status = 500;
    details;
    constructor(message, details) {
        super(message);
        this.name = 'ContractViolationError';
        this.details = details;
    }
}
//# sourceMappingURL=errors.js.map