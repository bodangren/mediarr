// Host half of dsh-media-automation: owns the ledger file and exposes it to agent turns as tools.
// Like dsh-measure-guard, the module imports no Harness package; capabilities come from ctx.
import { homedir, hostname } from 'node:os';
import path from 'node:path';

import {
  ledgerCounts,
  listAlerts,
  openLedger,
  raiseAlert,
  recordHeartbeat,
} from './src/ledger.js';
import { pruneQuarantine, quarantineFile } from './src/quarantine.js';

export const name = 'media-automation';

export const inject = ['tools'];

const STATUS_TOOL = 'media_automation_status';
const HEARTBEAT_TOOL = 'media_automation_heartbeat';
const ALERT_TOOL = 'media_automation_alert';
const QUARANTINE_TOOL = 'media_automation_quarantine';

export function apply(ctx, config) {
  const ledgerPath = config?.ledgerPath
    ?? process.env.DSH_MEDIA_LEDGER_PATH
    ?? path.join(homedir(), '.dsh', 'media-automation', 'ledger.db');
  const alertsJsonl = path.join(path.dirname(ledgerPath), 'alerts.jsonl');
  const db = openLedger(ledgerPath);

  // HMR/reload safety: closing the handle on dispose means a reloaded plugin cannot hold the file and
  // the next instance opens the same ledger (task B4 "prove HMR").
  ctx.effect(() => () => db.close(), 'media-automation:ledger');

  ctx.effect(() => ctx.tools.register({
    name: STATUS_TOOL,
    description: 'Media-automation ledger status: runs, failed runs, jobs, pending alerts, quarantine, heartbeat.',
    parameters: { type: 'object', properties: {} },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() {
      return JSON.stringify(ledgerCounts(db));
    },
  }), 'media-automation:status');

  ctx.effect(() => ctx.tools.register({
    name: HEARTBEAT_TOOL,
    description: 'Record that the media-automation brain ran (single-row heartbeat in the ledger).',
    parameters: {
      type: 'object',
      properties: { detail: { type: 'string', description: 'Optional summary of what ran.' } },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      const heartbeat = recordHeartbeat(db, {
        host: hostname(),
        detail: typeof args?.detail === 'string' ? args.detail : null,
      });
      return JSON.stringify(heartbeat);
    },
  }), 'media-automation:heartbeat');

  ctx.effect(() => ctx.tools.register({
    name: ALERT_TOOL,
    description: 'Raise a local-first alert (JSONL line + ledger row) and return pending alerts.',
    parameters: {
      type: 'object',
      required: ['level', 'code', 'message'],
      properties: {
        level: { type: 'string', enum: ['info', 'warning', 'critical'] },
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      raiseAlert(db, { level: args.level, code: args.code, message: args.message }, alertsJsonl);
      return JSON.stringify({ alerts: listAlerts(db, { status: 'PENDING', limit: 20 }), path: alertsJsonl });
    },
  }), 'media-automation:alert');

  ctx.effect(() => ctx.tools.register({
    name: QUARANTINE_TOOL,
    description: 'Quarantine or prune media files with copy+sha256 verification. Dry-run by default; live requires mode:"live".',
    parameters: {
      type: 'object',
      required: ['action', 'root'],
      properties: {
        action: { type: 'string', enum: ['quarantine', 'prune'] },
        file: { type: 'string', description: 'File to quarantine (action=quarantine).' },
        reason: { type: 'string', description: 'Why it is being quarantined.' },
        root: { type: 'string', description: 'Quarantine root directory on the media volume.' },
        mode: { type: 'string', enum: ['dry-run', 'live'], description: 'Default dry-run.' },
        maxBytes: { type: 'number', description: 'Cap for prune.' },
        maxAgeMs: { type: 'number', description: 'Age limit for prune.' },
      },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      const mode = args?.mode === 'live' ? 'live' : 'dry-run';
      if (args.action === 'quarantine') {
        if (typeof args.file !== 'string') throw new Error('quarantine requires file');
        return JSON.stringify(await quarantineFile(db, {
          file: args.file, root: args.root, reason: args.reason ?? 'unspecified', mode,
        }));
      }
      return JSON.stringify(await pruneQuarantine(db, {
        root: args.root, maxBytes: args.maxBytes, maxAgeMs: args.maxAgeMs, mode,
      }));
    },
  }), 'media-automation:quarantine');
}
