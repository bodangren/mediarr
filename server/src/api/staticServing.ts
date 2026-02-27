import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';

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

function looksLikeStaticAsset(requestPath: string): boolean {
  const lastSegment = requestPath.split('/').pop() ?? '';
  return path.extname(lastSegment) !== '';
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

    if (await fileExists(normalizedFilePath)) {
      const content = await fs.readFile(normalizedFilePath);
      const mimeType = getMimeType(normalizedFilePath);
      reply.header('Content-Type', mimeType);
      return content;
    }

    if (!looksLikeStaticAsset(requestPath) && (await fileExists(indexPath))) {
      const content = await fs.readFile(indexPath);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return content;
    }

    reply.code(404);
    return { ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } };
  });
}
