import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { deliverPendingAlerts, webhookTransport } from '../src/alerts.js';
import { listAlerts, openLedger, raiseAlert } from '../src/ledger.js';

const dirs = [];
function ledger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-alerts-'));
  dirs.push(dir);
  return openLedger(path.join(dir, 'ledger.db'));
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('alert delivery', () => {
  it('marks a delivered alert and records the attempt', async () => {
    const db = ledger();
    raiseAlert(db, { level: 'critical', code: 'X', message: 'boom' });
    const seen = [];
    const result = await deliverPendingAlerts(db, { transport: async (alert) => seen.push(alert.code) });
    expect(result).toMatchObject({ attempted: 1, delivered: 1, failed: 0, remaining: 0 });
    expect(seen).toEqual(['X']);
    expect(listAlerts(db)[0]).toMatchObject({ status: 'DELIVERED', attempts: 1 });
    db.close();
  });

  it('retries then fails an alert after maxAttempts', async () => {
    const db = ledger();
    raiseAlert(db, { level: 'critical', code: 'Y', message: 'down' });
    const failing = async () => { throw new Error('transport down'); };
    expect(await deliverPendingAlerts(db, { transport: failing, maxAttempts: 2 })).toMatchObject({ failed: 1, remaining: 1 });
    expect(await deliverPendingAlerts(db, { transport: failing, maxAttempts: 2 })).toMatchObject({ failed: 1, remaining: 0 });
    expect(listAlerts(db)[0]).toMatchObject({ status: 'FAILED', attempts: 2 });
    db.close();
  });

  it('reports no transport without touching the alert', async () => {
    const db = ledger();
    raiseAlert(db, { level: 'info', code: 'Z', message: 'note' });
    expect(await deliverPendingAlerts(db)).toMatchObject({ attempted: 0, remaining: 1, reason: 'no transport configured' });
    expect(listAlerts(db)[0].status).toBe('PENDING');
    db.close();
  });

  it('webhookTransport is null without an env URL and posts JSON when configured', async () => {
    expect(webhookTransport({})).toBeNull();
    const calls = [];
    const transport = webhookTransport({ MEDIA_AUTOMATION_ALERT_WEBHOOK: 'http://example.test/hook' }, async (url, init) => {
      calls.push([url, JSON.parse(init.body)]);
      return { ok: true, status: 200 };
    });
    await transport({ id: 1, code: 'A' });
    expect(calls[0][0]).toBe('http://example.test/hook');
    expect(calls[0][1]).toMatchObject({ code: 'A' });
  });
});
