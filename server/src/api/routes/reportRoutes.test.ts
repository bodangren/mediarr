import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { registerReportRoutes } from './reportRoutes';

const dirs: string[] = [];
async function reportFile(html: string | null): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'feature-report-'));
  dirs.push(dir);
  const file = path.join(dir, 'mediarr-features.html');
  if (html !== null) await fsp.writeFile(file, html);
  return file;
}
afterEach(async () => {
  for (const dir of dirs.splice(0)) await fsp.rm(dir, { recursive: true, force: true });
});

describe('feature report route', () => {
  it('serves the report with no-store so the 5-minute refresh sees updates', async () => {
    const reportPath = await reportFile('<html><body>report v1</body></html>');
    const app = Fastify();
    registerReportRoutes(app, { reportPath });
    const response = await app.inject({ method: 'GET', url: '/reports/features.html' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toContain('report v1');
    await app.close();
  });

  it('reads fresh bytes on every request (so track-end updates appear)', async () => {
    const reportPath = await reportFile('v1');
    const app = Fastify();
    registerReportRoutes(app, { reportPath });
    await fsp.writeFile(reportPath, 'v2');
    const response = await app.inject({ method: 'GET', url: '/reports/features.html' });
    expect(response.body).toBe('v2');
    await app.close();
  });

  it('returns 404 when the report is missing', async () => {
    const app = Fastify();
    registerReportRoutes(app, { reportPath: await reportFile(null) });
    const response = await app.inject({ method: 'GET', url: '/reports/features.html' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
