export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'PROVIDER_UNAVAILABLE'
  | 'TORRENT_REJECTED'
  | 'IMPORT_FAILED'
  | 'INTERNAL_ERROR';

export interface DomainErrorInit {
  code: DomainErrorCode;
  message: string;
  details?: unknown;
  httpStatus: number;
  retryable: boolean;
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: unknown;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(init: DomainErrorInit) {
    super(init.message);
    this.name = 'DomainError';
    this.code = init.code;
    this.details = init.details;
    this.httpStatus = init.httpStatus;
    this.retryable = init.retryable;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'NOT_FOUND',
      message,
      details,
      httpStatus: 404,
      retryable: false,
    });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      details,
      httpStatus: 422,
      retryable: false,
    });
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'CONFLICT',
      message,
      details,
      httpStatus: 409,
      retryable: false,
    });
    this.name = 'ConflictError';
  }
}

export class ProviderUnavailableError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'PROVIDER_UNAVAILABLE',
      message,
      details,
      httpStatus: 502,
      retryable: true,
    });
    this.name = 'ProviderUnavailableError';
  }
}

export class TorrentRejectedError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'TORRENT_REJECTED',
      message,
      details,
      httpStatus: 422,
      retryable: false,
    });
    this.name = 'TorrentRejectedError';
  }
}

export class ImportFailedError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'IMPORT_FAILED',
      message,
      details,
      httpStatus: 500,
      retryable: false,
    });
    this.name = 'ImportFailedError';
  }
}

export class InternalError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'INTERNAL_ERROR',
      message,
      details,
      httpStatus: 500,
      retryable: false,
    });
    this.name = 'InternalError';
  }
}

export interface DomainHttpEnvelope {
  httpStatus: number;
  error: {
    code: DomainErrorCode;
    message: string;
    details?: unknown;
    retryable: boolean;
    path?: string;
  };
}

function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('Unexpected internal error');
}

export function mapDomainErrorToHttp(
  error: unknown,
  path?: string,
): DomainHttpEnvelope {
  const domainError = toDomainError(error);

  return {
    httpStatus: domainError.httpStatus,
    error: {
      code: domainError.code,
      message: domainError.message,
      details: domainError.details,
      retryable: domainError.retryable,
      path,
    },
  };
}
