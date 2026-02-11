export class ApiClientError extends Error {
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
  }) {
    super(input.message);
    this.name = 'ApiClientError';
    this.code = input.code;
    this.status = input.status;
    this.retryable = input.retryable;
    this.details = input.details;
  }
}

export class ContractViolationError extends Error {
  readonly code = 'CONTRACT_VIOLATION';
  readonly status = 500;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ContractViolationError';
    this.details = details;
  }
}
