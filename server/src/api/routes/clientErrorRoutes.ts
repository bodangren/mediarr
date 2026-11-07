import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';

/**
 * Client crash/error ingestion.
 *
 * The TV client is unreachable except over ADB, so a failure the owner sees is
 * otherwise invisible to the server. The client posts every uncaught error and
 * every playback failure here; the records are appended to a JSONL file that
 * the operator (and the triage agent) can read, and exposed over GET so no
 * shell access is needed.
 *
 * File-based on purpose: it must never fail a migration or a request path, and
 * a corrupt/oversized log must be trivially discardable.
 */
const LOG_FILE = 'client-errors.jsonl';
const MAX_LOG_BYTES = 5 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_STACK_LENGTH = 16000;
const MAX_CONTEXT_KEYS = 40;

export interface ClientErrorRecord {
  id: string;
  receivedAt: string;
  clientTs?: string;
  appVersion?: string;
  versionCode?: number;
  platform?: string;
  route?: string;
  severity: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

function logDir(): string {
  return process.env.CONFIG_DIR ?? process.cwd();
}

function logPath(): string {
  return path.join(logDir(), LOG_FILE);
}

function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function sanitizeContext(raw: unknown): Record<string, unknown> | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).slice(0, MAX_CONTEXT_KEYS)) {
    const value = source[key];
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      out[key] = typeof value === 'string' && value.length > 1000
        ? value.slice(0, 1000)
        : value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const info = await stat(logPath());
    if (info.size < MAX_LOG_BYTES) return;
    await rename(logPath(), `${logPath()}.1`);
  } catch {
    // Missing file: nothing to rotate.
  }
}

export function registerClientErrorRoutes(app: FastifyInstance): void {
  app.post('/api/client-errors', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const message = clamp(body.message, MAX_MESSAGE_LENGTH);
    if (!message) {
      throw new ValidationError('message is required');
    }

    const record: ClientErrorRecord = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      receivedAt: new Date().toISOString(),
      severity: clamp(body.severity, 32) ?? 'error',
      message,
    };
    const clientTs = clamp(body.clientTs, 64);
    if (clientTs) record.clientTs = clientTs;
    const appVersion = clamp(body.appVersion, 64);
    if (appVersion) record.appVersion = appVersion;
    if (typeof body.versionCode === 'number' && Number.isFinite(body.versionCode)) {
      record.versionCode = Math.trunc(body.versionCode);
    }
    const platform = clamp(body.platform, 64);
    if (platform) record.platform = platform;
    const route = clamp(body.route, 200);
    if (route) record.route = route;
    const stack = clamp(body.stack, MAX_STACK_LENGTH);
    if (stack) record.stack = stack;
    const context = sanitizeContext(body.context);
    if (context) record.context = context;

    await mkdir(logDir(), { recursive: true });
    await rotateIfNeeded();
    await appendFile(logPath(), `${JSON.stringify(record)}\n`, 'utf-8');
    return reply.code(202).send({ ok: true, data: { id: record.id } });
  });

  app.get('/api/client-errors', async (request, reply) => {
    const query = request.query as { since?: string; limit?: string };
    const limitRaw = Number.parseInt(query.limit ?? '200', 10);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, 1000)
      : 200;
    const sinceMs = query.since ? Date.parse(query.since) : Number.NaN;

    let contents = '';
    try {
      contents = await readFile(logPath(), 'utf-8');
    } catch {
      return sendSuccess(reply, { items: [], total: 0 });
    }

    const items: ClientErrorRecord[] = [];
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const record = JSON.parse(trimmed) as ClientErrorRecord;
        if (Number.isFinite(sinceMs) && Date.parse(record.receivedAt) <= sinceMs) continue;
        items.push(record);
      } catch {
        // Skip a torn line rather than failing the whole read.
      }
    }

    return sendSuccess(reply, {
      items: items.slice(-limit),
      total: items.length,
    });
  });
}
