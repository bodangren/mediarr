import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function isCompressible(mimeType: string): boolean {
  return /^(text\/|application\/(javascript|json)|image\/svg\+xml)/.test(mimeType);
}

/** Vite's main bundle is ~1.9 MB uncompressed; gzip cuts LAN transfer to roughly a third. */
const gzipCache = new Map<string, { mtimeMs: number; body: Buffer }>();

function maybeCompress(
  request: { headers: Record<string, string | string[] | undefined> },
  filePath: string,
  mtimeMs: number,
  content: Buffer,
  mimeType: string,
): Buffer {
  if (!isCompressible(mimeType) || content.byteLength < 1024) return content;
  const accept = request.headers['accept-encoding'];
  const acceptsGzip = Array.isArray(accept) ? accept.some((value) => value.includes('gzip')) : (accept ?? '').includes('gzip');
  if (!acceptsGzip) return content;

  const cached = gzipCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.body;
  const body = gzipSync(content);
  gzipCache.set(filePath, { mtimeMs, body });
  return body;
}

function looksLikeStaticAsset(requestPath: string): boolean {
  const lastSegment = requestPath.split('/').pop() ?? '';
  return path.extname(lastSegment) !== '';
}

function applyCachePolicy(reply: { header(name: string, value: string): unknown }, requestPath: string, mimeType: string): void {
  // HTML is the deployment manifest for the SPA. It must revalidate so a
  // browser can discover a newly content-hashed bundle after an update.
  if (mimeType.startsWith('text/html')) {
    reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    return;
  }

  // Vite content-hashes files under /assets/. They can be cached aggressively
  // because each changed asset receives a new URL from a fresh index.html.
  if (requestPath.startsWith('/assets/')) {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  // Public assets retain stable paths, so do not let an old poster/icon stay
  // resident across a deployment.
  reply.header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
}

export function registerStaticServing(
  app: FastifyInstance,
  staticDir: string,
): void {
  const indexPath = path.join(staticDir, 'index.html');

  app.setNotFoundHandler(async (request, reply) => {
    const urlPath = request.url ?? '/';
    const requestPath = urlPath.split('?')[0] ?? '/';

    if (requestPath.startsWith('/api')) {
      reply.code(404);
      return { ok: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } };
    }

    if (!(await directoryExists(staticDir))) {
      reply.code(404);
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Static files not available' } };
    }

    const filePath = path.join(staticDir, requestPath);

    const normalizedStaticDir = path.resolve(staticDir);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedStaticDir)) {
      reply.code(403);
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Access denied' } };
    }

    let fileStat: Awaited<ReturnType<typeof fs.stat>> | null = null;
    try {
      fileStat = await fs.stat(normalizedFilePath);
    } catch {
      fileStat = null;
    }

    if (fileStat?.isFile()) {
      const raw = await fs.readFile(normalizedFilePath);
      const mimeType = getMimeType(normalizedFilePath);
      const content = maybeCompress(request, normalizedFilePath, fileStat.mtimeMs, raw, mimeType);
      reply.header('Content-Type', mimeType);
      if (content !== raw) reply.header('Content-Encoding', 'gzip');
      reply.header('Vary', 'Accept-Encoding');
      applyCachePolicy(reply, requestPath, mimeType);
      return content;
    }

    if (!looksLikeStaticAsset(requestPath) && (await fileExists(indexPath))) {
      const content = await fs.readFile(indexPath);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      applyCachePolicy(reply, requestPath, 'text/html; charset=utf-8');
      return content;
    }

    reply.code(404);
    return { ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } };
  });
}
