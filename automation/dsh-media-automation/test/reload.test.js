import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ledgerCounts, openLedger, recordHeartbeat } from '../src/ledger.js';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

// HMR stand-in: the plugin's ctx.effect disposes the handle; a reloaded instance must open the same
// ledger and see the previous state (no WAL lock left behind, no data loss).
describe('plugin reload safety', () => {
  it('survives dispose + re-open on the same ledger file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-ledger-reload-'));
    dirs.push(dir);
    const file = path.join(dir, 'ledger.db');
    const first = openLedger(file);
    recordHeartbeat(first, { host: 'host', detail: 'before reload' });
    first.close(); // what ctx.effect dispose does

    const second = openLedger(file);
    expect(ledgerCounts(second).heartbeat).toMatchObject({ detail: 'before reload' });
    recordHeartbeat(second, { host: 'host', detail: 'after reload' });
    expect(ledgerCounts(second).heartbeat).toMatchObject({ detail: 'after reload' });
    second.close();
  });
});
