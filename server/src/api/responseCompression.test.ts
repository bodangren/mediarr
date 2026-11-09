import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { compressJsonPayload } from './responseCompression';

function fakeRequest(acceptEncoding?: string) {
  return { headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {} };
}

function fakeReply(contentType = 'application/json; charset=utf-8') {
  const headers = new Map<string, string>();
  headers.set('content-type', contentType);
  return {
    headers,
    getHeader(name: string) { return headers.get(name); },
    header(name: string, value: string) { headers.set(name, value); return this; },
  };
}

describe('compressJsonPayload', () => {
  const bigJson = JSON.stringify({ items: Array.from({ length: 200 }, (_, id) => ({ id, title: 'x'.repeat(20) })) });

  it('gzips large JSON when the client accepts gzip', () => {
    const reply = fakeReply();
    const compressed = compressJsonPayload(fakeRequest('gzip, deflate'), reply, bigJson);
    expect(Buffer.isBuffer(compressed)).toBe(true);
    expect(reply.headers.get('content-encoding')).toBe('gzip');
    expect(reply.headers.get('vary')).toBe('Accept-Encoding');
    expect(gunzipSync(compressed as Buffer).toString('utf8')).toBe(bigJson);
  });

  it('leaves JSON identity without accept-encoding', () => {
    const reply = fakeReply();
    expect(compressJsonPayload(fakeRequest(), reply, bigJson)).toBe(bigJson);
    expect(reply.headers.get('content-encoding')).toBeUndefined();
  });

  it('never compresses non-JSON, tiny or already-encoded payloads', () => {
    expect(compressJsonPayload(fakeRequest('gzip'), fakeReply('text/event-stream'), bigJson)).toBe(bigJson);
    expect(compressJsonPayload(fakeRequest('gzip'), fakeReply(), '{"ok":true}')).toBe('{"ok":true}');
    const encodedReply = fakeReply();
    encodedReply.header('content-encoding', 'gzip');
    expect(compressJsonPayload(fakeRequest('gzip'), encodedReply, bigJson)).toBe(bigJson);
  });
});
