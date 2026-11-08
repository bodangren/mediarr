import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  acquireLock,
  addQuarantine,
  finishRun,
  ledgerCounts,
  listAlerts,
  openLedger,
  raiseAlert,
  readHeartbeat,
  recordHeartbeat,
  releaseLock,
  schemaVersion,
  startRun,
} from '../src/ledger.js';

const dirs = [];
function ledgerFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-ledger-'));
  dirs.push(dir);
  return path.join(dir, 'ledger.db');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('media automation ledger', () => {
  it('applies the frozen schema idempotently at version 1', () => {
    const db = openLedger(ledgerFile());
    expect(schemaVersion(db)).toBe(SCHEMA_VERSION);
    db.close();
  });

  it('books a run with taskId+attempt and retryOf', () => {
    const db = openLedger(ledgerFile());
    const started = startRun(db, { taskId: 'daily-orchestrator', attempt: 1 });
    expect(started.status).toBe('RUNNING');
    const failed = finishRun(db, { taskId: 'daily-orchestrator', attempt: 1, status: 'FAILED', outcome: 'bridge down', summary: 'no webbridge tools' });
    expect(failed.status).toBe('FAILED');
    expect(failed.finished_at).toBeTruthy();

    startRun(db, { taskId: 'daily-orchestrator', attempt: 2, retryOf: started.id });
    finishRun(db, { taskId: 'daily-orchestrator', attempt: 2, status: 'SUCCEEDED' });
    expect(ledgerCounts(db)).toMatchObject({ runs: 2, running: 0, failed: 1 });
    const retry = db.prepare('SELECT retry_of FROM runs WHERE task_id = ? AND attempt = 2').get('daily-orchestrator');
    expect(retry.retry_of).toBe(started.id);
    db.close();
  });

  it('keeps a single heartbeat row', () => {
    const db = openLedger(ledgerFile());
    recordHeartbeat(db, { host: 'tv-host', detail: 'first' });
    recordHeartbeat(db, { host: 'tv-host', detail: 'second' });
    expect(readHeartbeat(db)).toMatchObject({ host: 'tv-host', detail: 'second' });
    expect(db.prepare('SELECT count(*) n FROM heartbeat').get().n).toBe(1);
    db.close();
  });

  it('writes an alert locally first and records it in the ledger', () => {
    const file = ledgerFile();
    const db = openLedger(file);
    const jsonl = path.join(path.dirname(file), 'alerts.jsonl');
    raiseAlert(db, { level: 'critical', code: 'BRIDGE_DOWN', message: 'webbridge probe failed' }, jsonl);
    const lines = fs.readFileSync(jsonl, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ code: 'BRIDGE_DOWN', level: 'critical' });
    expect(listAlerts(db, { status: 'PENDING' })[0]).toMatchObject({ code: 'BRIDGE_DOWN', status: 'PENDING' });
    db.close();
  });

  it('gives the browser lock one owner until expiry or release', () => {
    const db = openLedger(ledgerFile());
    const now = new Date('2026-11-09T03:00:00Z');
    expect(acquireLock(db, { name: 'browser', owner: 'orchestrator', ttlMs: 60_000, now }).acquired).toBe(true);
    expect(acquireLock(db, { name: 'browser', owner: 'music', ttlMs: 60_000, now: new Date('2026-11-09T03:00:30Z') }).acquired).toBe(false);
    expect(acquireLock(db, { name: 'browser', owner: 'music', ttlMs: 60_000, now: new Date('2026-11-09T03:02:00Z') }).acquired).toBe(true);
    expect(releaseLock(db, { name: 'browser', owner: 'orchestrator' })).toBe(false);
    expect(releaseLock(db, { name: 'browser', owner: 'music' })).toBe(true);
    db.close();
  });

  it('tracks quarantine rows separately from alerts', () => {
    const db = openLedger(ledgerFile());
    addQuarantine(db, { filePath: '/data/Youtube/x.mp4', sha256: 'abc', bytes: 10, reason: 'watched+7d' });
    expect(ledgerCounts(db).quarantined).toBe(1);
    db.close();
  });
});
