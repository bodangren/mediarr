// Host half of dsh-operator-guard.
//
// The DeepSeek Harness is Mediarr's media brain (SYSTEM.md), but a session that loses its context
// forgets what it is for. This plugin makes the operator contract and the *live* pipeline state
// unavoidable:
//   - every root session is injected with the contract + staleness report at creation;
//   - a stale pipeline is re-announced once per turn at `agent/pre-step`;
//   - `operator_guard_status` returns the computed state for any session;
//   - `operator_guard_record` is the required closing act of a run (state changes or a blocker).
// The module imports no Harness package: capabilities come from ctx.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';

import {
  appendJsonLine,
  buildSessionText,
  computeStaleness,
  formatReminder,
  formatStatus,
  lastJsonLine,
  newestMtime,
  readText,
  timeOf,
} from './src/state.js';

export const name = 'operator-guard';

export const inject = ['tools', 'agents'];

const STATUS_TOOL = 'operator_guard_status';
const RECORD_TOOL = 'operator_guard_record';

/**
 * Count the Transmission queue without failing the status read: a missing daemon is reported as
 * `null` (the operator then checks by hand) rather than turning the whole guard into an error.
 * Asynchronous on purpose — the RPC can take ~10 s on this host and must never block the harness
 * event loop (the injection text does not depend on it; only the explicit status tool does).
 */
export async function readTransmissionQueue(run = defaultExecAsync) {
  let output;
  try {
    output = await run('transmission-remote', ['-l']);
  } catch {
    return null;
  }
  if (typeof output !== 'string') return null;
  let completed = 0;
  let downloading = 0;
  for (const line of output.split('\n')) {
    if (!/^\s*\d+\s+/.test(line)) continue;
    if (line.includes('100%')) completed += 1;
    else if (/\bDownloading\b/.test(line)) downloading += 1;
  }
  return { completed, downloading };
}

const execFileAsync = promisify(execFile);

function defaultExecAsync(command, args) {
  // stdin must be /dev/null: with an open pipe `transmission-remote` can wait for input and blow
  // the timeout even though the RPC itself answers.
  return execFileAsync(command, args, {
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).then(result => result.stdout);
}

/** Read every evidence source and fold it into the staleness verdict. */
export function readStatus(config = {}, options = {}) {
  const home = options.home ?? homedir();
  const now = options.now ?? Date.now();
  const pick = lastJsonLine(config.passPath ?? path.join(home, '.local/share/media-recommendations/pass.jsonl'));
  const run = lastJsonLine(config.runsPath ?? '/config/operator-runs.jsonl');
  // Ingest receipts, not the nightly "the task ran" receipt: the latter made a dead music pipeline
  // look fresh forever (the exact false negative this guard exists to prevent).
  const music = lastJsonLine(config.musicPath ?? '/config/music-ingest-receipts.jsonl');
  const backupDir = config.backupDir ?? '/config/backups';
  const lastBackupAt = newestMtime(backupDir, file => file.endsWith('.db'));
  const queue = options.queue ?? null;
  return computeStaleness({
    now,
    lastPickAt: timeOf(pick?.ts ?? pick?.at),
    lastBackupAt,
    lastRunAt: timeOf(run?.at),
    lastMusicAt: timeOf(music?.at),
    queue,
  });
}

function userMessage(text, summary) {
  return {
    role: 'user',
    id: randomUUID(),
    content: [{ type: 'text', text }],
    source: { kind: 'operator-guard', form: 'notice', summary },
  };
}

export function apply(ctx, config = {}) {
  const settings = {
    repo: config.repo ?? '/home/daniel-bo/Desktop/mediarr',
    runsPath: config.runsPath ?? '/config/operator-runs.jsonl',
    passPath: config.passPath,
    musicPath: config.musicPath,
    backupDir: config.backupDir,
  };
  const contractFile = path.join(settings.repo, 'automation/operator-contract.md');
  const injected = new Set();
  const turnSeen = new Map();

  const statusOf = () => readStatus(settings);

  const attach = agent => {
    if (agent === null || agent === undefined || injected.has(agent.id)) return;
    injected.add(agent.id);
    let text;
    try {
      const contract = readText(contractFile, 'You are Mediarr\'s media operator: choose, acquire, download, organize, manage. Never status-only.');
      text = buildSessionText(contract, statusOf());
    } catch {
      return;
    }
    if (typeof agent.inject === 'function') {
      try {
        agent.inject(userMessage(text, 'operator contract + pipeline state'));
      } catch {
        // A session that already ended must not break the host.
      }
    }
    const onPreStep = async (payload, next) => {
      const decision = await next();
      if (decision?.kind !== 'enter') return decision;
      let status;
      try {
        status = statusOf();
      } catch {
        return decision;
      }
      if (status.actions.length === 0) return decision;
      const turnKey = payload?.turn?.id ?? payload?.turn ?? 'unknown';
      if (turnSeen.get(agent.id) === turnKey) return decision;
      turnSeen.set(agent.id, turnKey);
      return { ...decision, messages: [...(decision.messages ?? []), userMessage(formatReminder(status), 'pipeline stale')] };
    };
    try {
      agent.ctx?.on?.('agent/pre-step', onPreStep);
    } catch {
      // No per-step seam on this agent; the session-start injection still stands.
    }
  };

  ctx.effect(() => {
    const disposers = [];
    for (const agent of ctx.agents.list()) {
      attach(agent);
      disposers.push(() => injected.delete(agent.id));
    }
    const created = ctx.on('agent/created', payload => attach(payload?.agent));
    const disposed = ctx.on('agent/disposed', payload => {
      const id = payload?.agent?.id;
      if (id !== undefined) {
        injected.delete(id);
        turnSeen.delete(id);
      }
    });
    return () => {
      try {
        created?.();
      } catch {
        /* ignore */
      }
      try {
        disposed?.();
      } catch {
        /* ignore */
      }
      for (const dispose of disposers) dispose();
    };
  }, 'operator-guard:agents');

  ctx.effect(() => ctx.tools.register({
    name: STATUS_TOOL,
    description:
      'Mediarr operator pipeline state: verdict (OK/STALE), ages of the last media pick, database backup '
      + 'and recorded operator run, the transmission queue, and the exact actions required now.',
    parameters: { type: 'object', properties: {} },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() {
      const status = statusOf();
      try {
        status.queue = await readTransmissionQueue();
      } catch {
        // informational only; the file-based verdict stands
      }
      return JSON.stringify(status);
    },
  }), 'operator-guard:status');

  ctx.effect(() => ctx.tools.register({
    name: RECORD_TOOL,
    description:
      'Close an operator run. Pass at least one real state change (file filed, torrent queued, sidecar '
      + 'placed, backup made) or a concrete blocker. A run with neither is a defect and is rejected.',
    parameters: {
      type: 'object',
      properties: {
        stateChanges: {
          type: 'array',
          items: { type: 'string' },
          description: 'Concrete changes made this run (what, where).',
        },
        blocker: {
          type: 'string',
          description: 'The exact blocker when nothing could be changed, and what was tried.',
        },
        session: { type: 'string', description: 'Optional session/run label.' },
      },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args) {
      const changes = Array.isArray(args?.stateChanges)
        ? args.stateChanges.filter(change => typeof change === 'string' && change.trim() !== '')
        : [];
      const blocker = typeof args?.blocker === 'string' ? args.blocker.trim() : '';
      if (changes.length === 0 && blocker === '') {
        return JSON.stringify({
          ok: false,
          error: 'A run must record at least one state change or a concrete blocker. Status-only runs are defects.',
        });
      }
      const entry = {
        at: new Date().toISOString(),
        session: typeof args?.session === 'string' ? args.session : null,
        stateChanges: changes,
        blocker: blocker === '' ? null : blocker,
      };
      appendJsonLine(settings.runsPath, entry);
      return JSON.stringify({ ok: true, recorded: entry, status: statusOf() });
    },
  }), 'operator-guard:record');
}

export { formatReminder, formatStatus };
