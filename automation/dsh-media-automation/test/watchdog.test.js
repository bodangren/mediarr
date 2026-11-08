import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openLedger } from '../src/ledger.js';
import { checkArtifacts, checkBridgeTools, checkHeartbeat, checkHost, checkSchedulerTasks, runWatchdog } from '../src/watchdog.js';

const dirs = [];
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-watchdog-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const expectations = {
  host: { mediarrHealth: { url: 'http://127.0.0.1:5174/api/health', timeoutMs: 100 }, maxHeartbeatAgeMinutes: 90 },
  bridge: { requiredTools: ['mcp__webbridge__navigate', 'mcp__webbridge__evaluate'] },
  scheduler: { expectedTasks: ['subtitle-sync', 'youtube-download'], maxTaskStalenessMinutes: 180 },
  artifacts: [{ path: '/tmp/receipts.jsonl', maxAgeHours: 36 }],
};

describe('substrate watchdog', () => {
  it('passes a healthy host, heartbeat and tools', async () => {
    const db = openLedger(path.join(tmp(), 'ledger.db'));
    db.prepare("INSERT INTO heartbeat (id, at, host) VALUES (1, ?, 'h')").run(new Date().toISOString());
    expect((await checkHost(expectations, { fetchImpl: async () => ({ ok: true, status: 200 }) })).ok).toBe(true);
    expect(checkHeartbeat(expectations, db).ok).toBe(true);
    expect(checkBridgeTools(expectations, ['mcp__webbridge__navigate', 'mcp__webbridge__evaluate']).ok).toBe(true);
    db.close();
  });

  it('fails a missing heartbeat, missing bridge tool and unreachable server', async () => {
    const db = openLedger(path.join(tmp(), 'ledger.db'));
    expect(checkHeartbeat(expectations, db).ok).toBe(false);
    expect(checkBridgeTools(expectations, ['mcp__webbridge__navigate'])).toMatchObject({ ok: false });
    expect((await checkHost(expectations, { fetchImpl: async () => { throw new Error('boom'); } })).ok).toBe(false);
    db.close();
  });

  it('flags stale scheduler tasks but tolerates tasks that never ran', () => {
    const now = new Date('2026-11-09T03:00:00Z');
    const stale = checkSchedulerTasks(expectations, [
      { taskName: 'subtitle-sync', lastRunAt: '2026-11-08T20:00:00Z' },
      { taskName: 'youtube-download', lastRunAt: null },
    ], { now });
    expect(stale.ok).toBe(false);
    expect(stale.detail).toContain('subtitle-sync');
    expect(stale.detail).not.toContain('youtube-download');
  });

  it('flags a missing or stale artifact', () => {
    const now = new Date('2026-11-09T03:00:00Z');
    expect(checkArtifacts(expectations, { now, stat: () => { throw new Error('ENOENT'); } }).detail).toContain('missing');
    const old = new Date('2026-11-01T00:00:00Z');
    expect(checkArtifacts(expectations, { now, stat: () => ({ mtimeMs: old.getTime() }) }).ok).toBe(false);
  });

  it('raises one alert per failing check and writes them locally first', async () => {
    const dir = tmp();
    const db = openLedger(path.join(dir, 'ledger.db'));
    const jsonl = path.join(dir, 'alerts.jsonl');
    const result = await runWatchdog({
      expectations,
      db,
      registeredTools: [],
      tasks: [],
      alertsJsonl: jsonl,
      fetchImpl: async () => ({ ok: false, status: 503 }),
      stat: () => { throw new Error('ENOENT'); },
    });
    expect(result.ok).toBe(false);
    const codes = db.prepare('SELECT code FROM alerts ORDER BY id').all().map((row) => row.code);
    expect(codes).toEqual(expect.arrayContaining(['WATCHDOG_MEDIARR_HEALTH', 'WATCHDOG_HEARTBEAT', 'WATCHDOG_BRIDGE_TOOLS', 'WATCHDOG_ARTIFACTS']));
    expect(fs.readFileSync(jsonl, 'utf-8').trim().split('\n').length).toBeGreaterThanOrEqual(4);
    db.close();
  });
});
