import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { apply, inject, name } from '../index.js';

const dirs = [];
function tmpLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-plugin-'));
  dirs.push(dir);
  return path.join(dir, 'ledger.db');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function fakeContext() {
  const tools = new Map();
  const disposers = [];
  return {
    tools,
    ctx: {
      tools: { register(tool) { tools.set(tool.name, tool); } },
      effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); },
    },
    disposeAll() { for (const dispose of disposers.splice(0)) dispose(); },
  };
}

// Plugin-load stand-in for HMR: apply() must register its tools and its effect cleanup must release
// the ledger handle so a reloaded instance can open the same file (same contract as dsh-measure-guard).
describe('dsh-media-automation plugin', () => {
  it('registers its tools through the harness tools service', () => {
    const { ctx, tools, disposeAll } = fakeContext();
    const ledgerPath = tmpLedger();
    apply(ctx, { ledgerPath, expectationsPath: '/home/daniel-bo/Desktop/mediarr/automation/expectations.yaml' });
    expect(name).toBe('media-automation');
    expect(inject).toEqual(['tools']);
    expect([...tools.keys()]).toEqual(expect.arrayContaining([
      'media_automation_status',
      'media_automation_heartbeat',
      'media_automation_alert',
      'media_automation_quarantine',
      'media_automation_watchdog',
    ]));
    disposeAll();
  });

  it('survives dispose + re-apply on the same ledger (HMR reload)', async () => {
    const ledgerPath = tmpLedger();
    const first = fakeContext();
    apply(first.ctx, { ledgerPath });
    await first.tools.get('media_automation_heartbeat').execute({ detail: 'before reload' });
    first.disposeAll();

    const second = fakeContext();
    apply(second.ctx, { ledgerPath });
    const status = JSON.parse(await second.tools.get('media_automation_status').execute({}));
    expect(status.heartbeat.detail).toBe('before reload');
    expect(status.schemaVersion).toBe(1);
    second.disposeAll();
  });
});
