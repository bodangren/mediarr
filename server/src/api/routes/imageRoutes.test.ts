import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import { registerImageRoutes } from './imageRoutes';

describe('GET /api/images/proxy registered handler', () => {
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    app = Fastify();
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerImageRoutes(app, { prisma: {} });
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it('proxies an allowed image with upstream bytes and cache headers', async () => {
    fetchMock.mockResolvedValue(new Response(Uint8Array.from([1, 2, 3, 4]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/images/proxy?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Foriginal%2Fposter.png',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['cache-control']).toBe('public, max-age=31536000');
    expect(response.rawPayload).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/original/poster.png',
      {
        headers: {
          'User-Agent': expect.stringContaining('Mozilla/5.0'),
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      },
    );
  });

  it('rejects missing, malformed, and untrusted URLs before fetching', async () => {
    const missingResponse = await app.inject({
      method: 'GET',
      url: '/api/images/proxy',
    });
    expect(missingResponse.statusCode).toBe(422);
    expect(missingResponse.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        path: '/api/images/proxy',
        retryable: false,
      },
    });

    const malformedResponse = await app.inject({
      method: 'GET',
      url: '/api/images/proxy?url=not-a-url',
    });
    expect(malformedResponse.statusCode).toBe(422);
    expect(malformedResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid URL provided',
        retryable: false,
        path: '/api/images/proxy?url=not-a-url',
      },
    });

    const untrustedResponse = await app.inject({
      method: 'GET',
      url: '/api/images/proxy?url=https%3A%2F%2Fexample.com%2Fposter.jpg',
    });
    expect(untrustedResponse.statusCode).toBe(422);
    expect(untrustedResponse.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Domain example.com is not allowed for image proxying',
        retryable: false,
        path: '/api/images/proxy?url=https%3A%2F%2Fexample.com%2Fposter.jpg',
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves an upstream non-success status without returning image bytes', async () => {
    fetchMock.mockResolvedValue(new Response('not found', {
      status: 404,
      statusText: 'Not Found',
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/images/proxy?url=https%3A%2F%2Fartworks.thetvdb.com%2Fbanners%2Fmissing.jpg',
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('Failed to fetch image: Not Found');
  });

  it('returns an explicit 500 error when the upstream fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/images/proxy?url=https%3A%2F%2Fthetvdb.com%2Fposter.jpg',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: 'Internal Server Error while proxying image',
    });
  });
});
