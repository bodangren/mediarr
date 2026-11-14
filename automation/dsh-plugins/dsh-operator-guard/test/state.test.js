import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  appendJsonLine,
  buildSessionText,
  computeStaleness,
  formatReminder,
  formatStatus,
  lastJsonLine,
  newestMtime,
  parseJsonLine,
  readText,
  timeOf,
} from '../src/state.js';
import { readStatus, readTransmissionQueue } from '../index.js';

const NOW = Date.parse('2026-11-14T16:30:00+08:00');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const fresh = {
  now: NOW,
  lastPickAt: NOW - 2 * HOUR,
  lastBackupAt: NOW - 1 * DAY,
  lastRunAt: NOW - 3 * HOUR,
  lastMusicAt: NOW - 2 * DAY,
  queue: { completed: 4, downloading: 2 },
};

test('computeStaleness: a fresh pipeline is OK with no actions', () => {
  const status = computeStaleness(fresh);
  assert.equal(status.verdict, 'OK');
  assert.deepEqual(status.actions, []);
  assert.equal(status.queue.downloading, 2);
});

test('computeStaleness: an old pick is the acquisition action', () => {
  const status = computeStaleness({ ...fresh, lastPickAt: NOW - 5 * DAY });
  assert.equal(status.verdict, 'STALE');
  assert.match(status.actions.join('\n'), /acquire: no pick in 120h \(limit 30h\)/);
});

test('computeStaleness: a missing pick is named as never recorded', () => {
  const status = computeStaleness({ ...fresh, lastPickAt: 0 });
  assert.match(status.actions.join('\n'), /no media pick has ever been recorded/);
});

test('computeStaleness: a week-old backup is stale, a missing one is worse', () => {
  assert.match(computeStaleness({ ...fresh, lastBackupAt: NOW - 8 * DAY }).actions.join('\n'), /backup: newest backup is 8d old/);
  assert.match(computeStaleness({ ...fresh, lastBackupAt: 0 }).actions.join('\n'), /backup: no database backup found/);
});

test('computeStaleness: a missing operator run record is an action', () => {
  assert.match(computeStaleness({ ...fresh, lastRunAt: 0 }).actions.join('\n'), /record: no operator run has been recorded yet/);
  assert.match(computeStaleness({ ...fresh, lastRunAt: NOW - 40 * HOUR }).actions.join('\n'), /no operator run recorded in 40h/);
});

test('computeStaleness: music only complains when a receipt exists but is old', () => {
  assert.deepEqual(computeStaleness({ ...fresh, lastMusicAt: 0 }).actions, []);
  assert.match(computeStaleness({ ...fresh, lastMusicAt: NOW - 9 * DAY }).actions.join('\n'), /music: no music ingest receipt in 216h/);
});

test('timeOf accepts ISO strings, epoch seconds and epoch milliseconds', () => {
  assert.equal(timeOf('2026-11-14T08:30:00.000Z'), Date.parse('2026-11-14T08:30:00.000Z'));
  assert.equal(timeOf(1_700_000_000), 1_700_000_000_000);
  assert.equal(timeOf(1_700_000_000_000), 1_700_000_000_000);
  assert.equal(timeOf('not-a-date'), 0);
  assert.equal(timeOf(undefined), 0);
});

test('formatStatus names the verdict, the ages and every required action', () => {
  const status = computeStaleness({ ...fresh, lastPickAt: NOW - 5 * DAY });
  const text = formatStatus(status);
  assert.match(text, /^PIPELINE .*: STALE/m);
  assert.match(text, /last pick: 5d ago/);
  assert.match(text, /transmission: 4 completed, 2 downloading/);
  assert.match(text, /acquire: no pick in 120h/);
});

test('formatStatus says "none" when the pipeline is healthy', () => {
  assert.match(formatStatus(computeStaleness(fresh)), /required now: none/);
});

test('formatReminder is an instruction to act, not a report', () => {
  const reminder = formatReminder(computeStaleness({ ...fresh, lastPickAt: NOW - 5 * DAY }));
  assert.match(reminder, /PIPELINE STALE — this run must fix it, not describe it/);
  assert.match(reminder, /operator_guard_record/);
});

test('buildSessionText carries the contract, live state and the closing requirement', () => {
  const text = buildSessionText('# Contract\nNever status-only.', computeStaleness(fresh));
  assert.match(text, /^# Contract/);
  assert.match(text, /Live pipeline state/);
  assert.match(text, /End this run with `operator_guard_record`/);
});

test('lastJsonLine skips a truncated trailing line', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'operator-guard-'));
  const file = path.join(dir, 'runs.jsonl');
  writeFileSync(file, `${JSON.stringify({ at: '2026-11-14T00:00:00.000Z', n: 1 })}\n{"at":`);
  assert.equal(lastJsonLine(file).n, 1);
  assert.equal(lastJsonLine(path.join(dir, 'missing.jsonl')), null);
});

test('appendJsonLine creates the directory and appends one parseable line', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'operator-guard-'));
  const file = path.join(dir, 'nested/runs.jsonl');
  appendJsonLine(file, { at: '2026-11-14T00:00:00.000Z', stateChanges: ['queued Lioness S02'] });
  appendJsonLine(file, { at: '2026-11-14T01:00:00.000Z', blocker: 'bridge absent' });
  assert.equal(lastJsonLine(file).blocker, 'bridge absent');
});

test('newestMtime only counts the filtered files', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'operator-guard-'));
  writeFileSync(path.join(dir, 'old.db'), 'x');
  writeFileSync(path.join(dir, 'notes.txt'), 'x');
  assert.ok(newestMtime(dir, name => name.endsWith('.db')) > 0);
  assert.equal(newestMtime(path.join(dir, 'nope'), () => true), 0);
});

test('parseJsonLine and readText are failure-tolerant', () => {
  assert.equal(parseJsonLine('{oops'), null);
  assert.equal(parseJsonLine('{"a":1}').a, 1);
  assert.equal(readText('/definitely/missing', 'fallback'), 'fallback');
});

test('readTransmissionQueue counts completed and downloading rows, null on failure', async () => {
  const output = [
    '    ID    Done       Have  ETA            Up      Down  Ratio  Status       Name',
    '    13    100%   5.53 GB  Done            0.0       0.0   0.01  Idle         Show S01',
    '    22    0.01%   1.8 MB  5 days          0.0      24.6   0.00  Downloading  Lioness S02',
    'Sum:             48.40 GB                     0.0      24.6',
  ].join('\n');
  assert.deepEqual(await readTransmissionQueue(async () => output), { completed: 1, downloading: 1 });
  assert.equal(await readTransmissionQueue(async () => { throw new Error('no daemon'); }), null);
});

test('readStatus folds files, backup mtime, queue and manual overrides together', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'operator-guard-'));
  const pass = path.join(home, 'pass.jsonl');
  const runs = path.join(home, 'runs.jsonl');
  const music = path.join(home, 'music.jsonl');
  const backups = path.join(home, 'backups');
  appendJsonLine(pass, { ts: new Date(NOW - 2 * HOUR).toISOString() });
  appendJsonLine(runs, { at: new Date(NOW - HOUR).toISOString(), stateChanges: ['x'] });
  appendJsonLine(music, { at: new Date(NOW - DAY).toISOString() });
  appendJsonLine(path.join(backups, 'agent_backup.db'), {});
  const status = readStatus({ passPath: pass, runsPath: runs, musicPath: music, backupDir: backups },
    { home, now: NOW, queue: { completed: 0, downloading: 3 } });
  assert.equal(status.verdict, 'OK');
  assert.equal(status.queue.downloading, 3);
});
