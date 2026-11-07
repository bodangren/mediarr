import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';

const UPDATE_DIR = 'client-updates';
const MANIFEST = 'manifest.json';

function updateDir(): string {
  return path.join(process.env.CONFIG_DIR ?? process.cwd(), UPDATE_DIR);
}

/** Latest Android client APK metadata, published by automation/scripts/publish-client-update.sh. */
export function registerClientUpdateRoutes(app: FastifyInstance): void {
  app.get('/api/client/update', async (_request, reply) => {
    try {
      const raw = await fsp.readFile(path.join(updateDir(), MANIFEST), 'utf-8');
      const manifest: unknown = JSON.parse(raw);
      return reply.send({ ok: true, data: manifest });
    } catch {
      return reply.send({ ok: true, data: null });
    }
  });

  app.get('/api/client/download', async (request, reply) => {
    const { file } = request.query as { file?: string };
    if (!file || path.basename(file) !== file || !file.endsWith('.apk')) {
      return reply.status(400).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'invalid file' } });
    }
    const apkPath = path.join(updateDir(), file);
    try {
      const stat = await fsp.stat(apkPath);
      reply.header('Content-Type', 'application/vnd.android.package-archive');
      reply.header('Content-Length', stat.size);
      reply.header('Content-Disposition', `attachment; filename="${file}"`);
      return reply.send(fs.createReadStream(apkPath));
    } catch {
      return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'update not found' } });
    }
  });
}
