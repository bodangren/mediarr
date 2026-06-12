import { HttpResponse } from 'msw';

export function numberQuery(url: URL, key: string, fallback: number): number {
  const value = url.searchParams.get(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sendSuccess<T>(data: T, status = 200) {
  return HttpResponse.json({ ok: true, data }, { status });
}

export function sendPaginated<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / Math.max(pageSize, 1)) : 0;
  const start = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
  const paged = {
    items: items.slice(start, start + pageSize),
    meta: {
      page: Math.max(page, 1),
      pageSize: Math.max(pageSize, 1),
      totalCount,
      totalPages,
    },
  };

  return HttpResponse.json({ ok: true, data: paged.items, meta: paged.meta }, { status: 200 });
}

export function sendError(code: string, message: string, status: number, details?: unknown) {
  return HttpResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
        retryable: false,
      },
    },
    { status },
  );
}

function toArrayBuffer(body: BlobPart): ArrayBuffer {
  if (typeof body === 'string') {
    return new TextEncoder().encode(body).buffer;
  }
  if (body instanceof ArrayBuffer) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  }
  if (ArrayBuffer.isView(body)) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  }
  return new TextEncoder().encode(String(body)).buffer;
}

export function sendBlob(body: BlobPart, filename: string, contentType: string): HttpResponse {
  return HttpResponse.arrayBuffer(toArrayBuffer(body), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
