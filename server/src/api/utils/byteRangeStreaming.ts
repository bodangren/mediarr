import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyReply } from 'fastify';

export interface ByteRange { start: number; end: number; }
const MIME_TYPES: Record<string, string> = {
  '.mkv': 'video/x-matroska',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.ts': 'video/mp2t',
};

export function parseRangeHeader(value: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim()); if (!match) return null;
  const startText = match[1] ?? ''; const endText = match[2] ?? ''; if (!startText && !endText) return null;
  if (!startText) { const suffix = Number.parseInt(endText, 10); return Number.isInteger(suffix) && suffix > 0 ? { start: Math.max(size - suffix, 0), end: size - 1 } : null; }
  const start = Number.parseInt(startText, 10); if (!Number.isInteger(start) || start < 0 || start >= size) return null;
  if (!endText) return { start, end: size - 1 }; const end = Number.parseInt(endText, 10);
  return Number.isInteger(end) && end >= start ? { start, end: Math.min(end, size - 1) } : null;
}

export function getStreamMimeType(filePath: string): string { return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'; }

/** Shared SPA/Jellyfin 200, 206, and 416 stream response implementation. */
export async function sendByteRangeStream(reply: FastifyReply, filePath: string, header: string | undefined) {
  const size = (await fs.stat(filePath)).size; reply.header('Content-Type', getStreamMimeType(filePath)); reply.header('Accept-Ranges', 'bytes');
  if (!header?.trim()) { reply.header('Content-Length', size); return reply.code(200).send(createReadStream(filePath)); }
  const range = parseRangeHeader(header, size);
  if (!range) { reply.header('Content-Range', `bytes */${size}`); return reply.code(416).send(); }
  reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`); reply.header('Content-Length', range.end - range.start + 1);
  return reply.code(206).send(createReadStream(filePath, range));
}
