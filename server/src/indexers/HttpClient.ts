export interface HttpClientOptions {
  timeout?: number;
  userAgent?: string;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  body: string;
  headers: Record<string, string>;
}

type FetchFn = typeof globalThis.fetch;

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * HTTP client with configurable timeouts, user-agent, headers, and cookie support.
 */
export class HttpClient {
  private timeout: number;
  private userAgent: string;
  private cookieJar: Map<string, string[]> = new Map();

  constructor(options: HttpClientOptions = {}) {
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'User-Agent': this.userAgent,
      ...extra,
    };
  }

  async get(
    url: string,
    options: { headers?: Record<string, string> } = {},
    fetchFn: FetchFn = globalThis.fetch,
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetchFn(url, {
        method: 'GET',
        headers: this.buildHeaders(options.headers),
        signal: controller.signal,
      });

      return this.toHttpResponse(response);
    } finally {
      clearTimeout(timer);
    }
  }

  async post(
    url: string,
    options: { headers?: Record<string, string>; body?: string } = {},
    fetchFn: FetchFn = globalThis.fetch,
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: this.buildHeaders(options.headers),
        body: options.body,
        signal: controller.signal,
      });

      return this.toHttpResponse(response);
    } finally {
      clearTimeout(timer);
    }
  }

  setCookie(url: string, cookie: string): void {
    const domain = new URL(url).hostname;
    const existing = this.cookieJar.get(domain) ?? [];
    existing.push(cookie);
    this.cookieJar.set(domain, existing);
  }

  getCookies(url: string): string {
    const domain = new URL(url).hostname;
    const cookies = this.cookieJar.get(domain) ?? [];
    return cookies.join('; ');
  }

  private async toHttpResponse(response: Response): Promise<HttpResponse> {
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      ok: response.ok,
      body,
      headers,
    };
  }
}
