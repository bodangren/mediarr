import { z } from 'zod';
import { ApiClientError, ContractViolationError } from './errors';
import {
  apiErrorEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
  type PaginationMeta,
} from './schemas';

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
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

function toQueryString(query: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.set(key, String(value));
  }

  const serialized = searchParams.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}

export class ApiHttpClient {
  private readonly baseUrl: string;
  private readonly fetchFn?: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ApiHttpClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? '';
    this.fetchFn = config.fetchFn;
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  async request<T>(
    config: RequestConfig,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const payload = await this.execute(config);

    const errorEnvelope = apiErrorEnvelopeSchema.safeParse(payload.body);
    if (errorEnvelope.success) {
      throw new ApiClientError({
        code: errorEnvelope.data.error.code,
        message: errorEnvelope.data.error.message,
        details: errorEnvelope.data.error.details,
        retryable: errorEnvelope.data.error.retryable,
        status: payload.status,
      });
    }

    const parsed = successEnvelopeSchema(schema).safeParse(payload.body);
    if (!parsed.success) {
      throw new ContractViolationError('Response did not match success envelope contract', {
        issues: parsed.error.issues,
        payload: payload.body,
      });
    }

    return parsed.data.data as T;
  }

  async requestPaginated<T>(
    config: RequestConfig,
    itemSchema: z.ZodType<T>,
  ): Promise<PaginatedResult<T>> {
    const payload = await this.execute(config);

    const errorEnvelope = apiErrorEnvelopeSchema.safeParse(payload.body);
    if (errorEnvelope.success) {
      throw new ApiClientError({
        code: errorEnvelope.data.error.code,
        message: errorEnvelope.data.error.message,
        details: errorEnvelope.data.error.details,
        retryable: errorEnvelope.data.error.retryable,
        status: payload.status,
      });
    }

    const parsed = paginatedEnvelopeSchema(itemSchema).safeParse(payload.body);
    if (!parsed.success) {
      throw new ContractViolationError(
        'Response did not match paginated envelope contract',
        {
          issues: parsed.error.issues,
          payload: payload.body,
        },
      );
    }

    return {
      items: parsed.data.data as T[],
      meta: parsed.data.meta,
    };
  }

  private async execute(config: RequestConfig): Promise<{ status: number; body: unknown }> {
    const requestUrl = `${this.baseUrl}${config.path}${toQueryString((config.query ?? {}) as Record<string, unknown>)}`;
    const fetchImpl =
      this.fetchFn ??
      (typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : undefined);

    if (!fetchImpl) {
      throw new ContractViolationError('Fetch is not available in this runtime');
    }

    const response = await fetchImpl(requestUrl, {
      method: config.method ?? 'GET',
      headers: {
        ...this.defaultHeaders,
        ...(config.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(config.headers ?? {}),
      },
      body: config.body === undefined ? undefined : JSON.stringify(config.body),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new ContractViolationError('Expected JSON response payload', {
        status: response.status,
        contentType,
      });
    }

    const body = await response.json();

    if (!response.ok) {
      const parsedError = apiErrorEnvelopeSchema.safeParse(body);
      if (parsedError.success) {
        return {
          status: response.status,
          body: parsedError.data,
        };
      }

      throw new ContractViolationError('Non-OK response did not match error envelope contract', {
        status: response.status,
        payload: body,
      });
    }

    return {
      status: response.status,
      body,
    };
  }
}
