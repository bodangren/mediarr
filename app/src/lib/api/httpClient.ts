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
  onUploadProgress?: (progress: number) => void;
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
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
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
    itemSchema: z.ZodType<T, z.ZodTypeDef, unknown>,
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

  async requestBlob(config: RequestConfig): Promise<Blob> {
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

    if (!response.ok) {
      throw new ApiClientError({
        code: 'REQUEST_FAILED',
        message: `Export request failed with status ${response.status}`,
        retryable: false,
        status: response.status,
      });
    }

    return await response.blob();
  }

  private async execute(config: RequestConfig): Promise<{ status: number; body: unknown }> {
    const requestUrl = `${this.baseUrl}${config.path}${toQueryString((config.query ?? {}) as Record<string, unknown>)}`;
    const hasUploadProgressCallback = typeof config.onUploadProgress === 'function';
    const isFormData = typeof FormData !== 'undefined' && config.body instanceof FormData;

    if (hasUploadProgressCallback && isFormData && typeof XMLHttpRequest !== 'undefined') {
      return this.executeWithXhr(requestUrl, config);
    }

    const fetchImpl =
      this.fetchFn ??
      (typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : undefined);

    if (!fetchImpl) {
      throw new ContractViolationError('Fetch is not available in this runtime');
    }

    const hasJsonBody = config.body !== undefined && !(typeof FormData !== 'undefined' && config.body instanceof FormData);
    const response = await fetchImpl(requestUrl, {
      method: config.method ?? 'GET',
      headers: {
        ...this.defaultHeaders,
        ...(hasJsonBody ? { 'content-type': 'application/json' } : {}),
        ...(config.headers ?? {}),
      },
      body: config.body === undefined
        ? undefined
        : hasJsonBody
          ? JSON.stringify(config.body)
          : (config.body as BodyInit),
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

  private executeWithXhr(
    requestUrl: string,
    config: RequestConfig,
  ): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(config.method ?? 'POST', requestUrl, true);

      const headers = {
        ...this.defaultHeaders,
        ...(config.headers ?? {}),
      };

      for (const [header, value] of Object.entries(headers)) {
        xhr.setRequestHeader(header, value);
      }

      xhr.upload.onprogress = event => {
        if (!event.lengthComputable || !config.onUploadProgress) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);
        config.onUploadProgress(progress);
      };

      xhr.onerror = () => {
        reject(new ContractViolationError('Upload request failed before receiving a response'));
      };

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('content-type') ?? '';
        if (!contentType.toLowerCase().includes('application/json')) {
          reject(
            new ContractViolationError('Expected JSON response payload', {
              status: xhr.status,
              contentType,
            }),
          );
          return;
        }

        let body: unknown;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          reject(
            new ContractViolationError('Failed to parse JSON response payload', {
              status: xhr.status,
            }),
          );
          return;
        }

        resolve({
          status: xhr.status,
          body,
        });
      };

      if (typeof FormData !== 'undefined' && config.body instanceof FormData) {
        xhr.send(config.body);
        return;
      }

      xhr.send(config.body === undefined ? undefined : JSON.stringify(config.body));
    });
  }
}
