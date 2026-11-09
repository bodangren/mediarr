import { gzipSync } from 'node:zlib';

interface CompressionReply {
  getHeader?(name: string): unknown;
  header?(name: string, value: string): unknown;
}

interface CompressionRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * gzip JSON API responses above 1 KB when the client accepts it.
 *
 * The SPA/TV library endpoints are the heavy ones (`/api/movies?pageSize=500` is ~2 MB of JSON,
 * ~190 KB gzipped). SSE, non-JSON and already-encoded payloads are left untouched; small responses stay
 * identity so health checks and tests do not pay compression cost.
 */
export function compressJsonPayload(
  request: CompressionRequest,
  reply: CompressionReply,
  payload: unknown,
): unknown {
  if (typeof payload !== 'string' || payload.length < 1024) return payload;

  const contentType = String(reply.getHeader?.('content-type') ?? '');
  if (!contentType.startsWith('application/json')) return payload;
  if (reply.getHeader?.('content-encoding')) return payload;

  const accept = request.headers['accept-encoding'];
  const acceptsGzip = Array.isArray(accept)
    ? accept.some((value) => value.includes('gzip'))
    : (accept ?? '').includes('gzip');
  if (!acceptsGzip) return payload;

  reply.header?.('content-encoding', 'gzip');
  reply.header?.('vary', 'Accept-Encoding');
  return gzipSync(payload);
}
