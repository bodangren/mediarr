import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../server/src/indexers/HttpClient';

// We test HttpClient's configuration, header building, and timeout handling
// without making real network requests by mocking fetch.

describe('HttpClient', () => {
  let client;

  beforeEach(() => {
    client = new HttpClient({
      timeout: 10000,
      userAgent: 'Mediarr/1.0',
    });
  });

  it('should create with default options', () => {
    const defaultClient = new HttpClient();
    expect(defaultClient).toBeDefined();
  });

  it('should create with custom options', () => {
    expect(client).toBeDefined();
  });

  it('should build request headers with user agent', () => {
    const headers = client.buildHeaders();
    expect(headers['User-Agent']).toBe('Mediarr/1.0');
  });

  it('should merge custom headers', () => {
    const headers = client.buildHeaders({ 'X-Custom': 'value', 'Accept': 'application/xml' });
    expect(headers['User-Agent']).toBe('Mediarr/1.0');
    expect(headers['X-Custom']).toBe('value');
    expect(headers['Accept']).toBe('application/xml');
  });

  it('should build a GET request with timeout via AbortSignal', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<xml>response</xml>',
      headers: new Headers({ 'content-type': 'application/xml' }),
    });

    const response = await client.get('https://example.com/api?t=caps', {}, mockFetch);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://example.com/api?t=caps');
    expect(options.method).toBe('GET');
    expect(options.headers['User-Agent']).toBe('Mediarr/1.0');
    expect(options.signal).toBeDefined();
  });

  it('should return parsed response with status, body, and headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'response body',
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const response = await client.get('https://example.com/', {}, mockFetch);
    expect(response.status).toBe(200);
    expect(response.body).toBe('response body');
    expect(response.ok).toBe(true);
  });

  it('should handle non-OK responses without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
      headers: new Headers(),
    });

    const response = await client.get('https://example.com/missing', {}, mockFetch);
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should throw on network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(client.get('https://example.com/', {}, mockFetch)).rejects.toThrow('Network error');
  });

  it('should support POST requests with body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
      headers: new Headers(),
    });

    await client.post('https://example.com/login', {
      body: 'username=test&password=pass',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, mockFetch);

    const [url, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('username=test&password=pass');
  });

  it('should support cookie jar (set and get cookies)', () => {
    client.setCookie('https://example.com', 'session=abc123; Path=/');
    const cookies = client.getCookies('https://example.com');
    expect(cookies).toContain('session=abc123');
  });
});
