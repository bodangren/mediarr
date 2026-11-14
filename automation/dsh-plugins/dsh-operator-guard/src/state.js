// Pure staleness/state logic for dsh-operator-guard.
// No Harness imports: the plugin host supplies capabilities, and these rules are unit-tested without
// a host (test/state.test.js). File helpers are the only I/O and are separated from the rules.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** A pick older than 30 h means the acquisition pipeline is not running. */
export const PICK_STALE_MS = 30 * 3_600_000;
/** The database must never be older than a week. */
export const BACKUP_STALE_MS = 7 * 24 * 3_600_000;
/** The operator must record a run at least every 36 h (daily runs plus slack). */
export const RUN_STALE_MS = 36 * 3_600_000;
/** Music is weekly; 8 days allows the Sunday slot to slip by a day before it is called stale. */
export const MUSIC_STALE_MS = 8 * 24 * 3_600_000;

/** Parse one JSONL line; junk lines are skipped rather than crashing a run. */
export function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/** Milliseconds for an ISO string or a unix-seconds/milliseconds number; 0 when unknown. */
export function timeOf(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function hours(a, b) {
  return (b - a) / 3_600_000;
}

/**
 * The whole contract as data: given the last timestamps, decide whether the pipeline is OK and
 * list the exact actions a run must take now. `input.queue` is optional transmission counts.
 */
export function computeStaleness(input = {}) {
  const now = timeOf(input.now) || Date.now();
  const pick = timeOf(input.lastPickAt);
  const backup = timeOf(input.lastBackupAt);
  const run = timeOf(input.lastRunAt);
  const music = timeOf(input.lastMusicAt);
  const ages = {
    pickHours: pick ? hours(pick, now) : null,
    backupHours: backup ? hours(backup, now) : null,
    runHours: run ? hours(run, now) : null,
    musicHours: music ? hours(music, now) : null,
  };
  const actions = [];
  if (!pick) actions.push('acquire: no media pick has ever been recorded (pass.jsonl is empty)');
  else if (now - pick > PICK_STALE_MS) {
    actions.push(`acquire: no pick in ${Math.round(ages.pickHours)}h (limit 30h)`);
  }
  if (!backup) actions.push('backup: no database backup found');
  else if (now - backup > BACKUP_STALE_MS) {
    actions.push(`backup: newest backup is ${Math.round(ages.backupHours / 24)}d old (limit 7d)`);
  }
  if (!run) actions.push('record: no operator run has been recorded yet');
  else if (now - run > RUN_STALE_MS) {
    actions.push(`record: no operator run recorded in ${Math.round(ages.runHours)}h (limit 36h)`);
  }
  if (music && now - music > MUSIC_STALE_MS) {
    actions.push(`music: no music ingest receipt in ${Math.round(ages.musicHours)}h`);
  }
  return {
    at: new Date(now).toISOString(),
    verdict: actions.length === 0 ? 'OK' : 'STALE',
    actions,
    ages,
    queue: input.queue ?? null,
  };
}

function age(hoursValue) {
  if (hoursValue === null || hoursValue === undefined) return 'never';
  if (hoursValue < 2) return `${Math.round(hoursValue * 60)}m ago`;
  if (hoursValue < 48) return `${Math.round(hoursValue)}h ago`;
  return `${Math.round(hoursValue / 24)}d ago`;
}

/** One compact block for the agent: verdict, ages, required actions, queue summary. */
export function formatStatus(status) {
  const lines = [`PIPELINE ${status.at}: ${status.verdict}`];
  lines.push(
    `last pick: ${age(status.ages?.pickHours)} | last backup: ${age(status.ages?.backupHours)}`
    + ` | last recorded run: ${age(status.ages?.runHours)}`,
  );
  if (status.queue !== null && status.queue !== undefined) {
    lines.push(`transmission: ${status.queue.completed ?? 0} completed, ${status.queue.downloading ?? 0} downloading`);
  }
  if (!status.actions || status.actions.length === 0) {
    lines.push('required now: none — keep managing (subtitles, imports, music window, backup age)');
  } else {
    lines.push('required now:');
    for (const action of status.actions) lines.push(`- ${action}`);
  }
  return lines.join('\n');
}

/** The short per-turn reminder that breaks a goldfish loop. */
export function formatReminder(status) {
  return [
    'PIPELINE STALE — this run must fix it, not describe it.',
    ...(status.actions ?? []).map(action => `- ${action}`),
    'Do the work now (see automation/skills/media-operator/SKILL.md, or music/adult for those runs)',
    'and close with operator_guard_record listing the state changes or the concrete blocker.',
  ].join('\n');
}

/** The full session-start message: contract + live state + closing instruction. */
export function buildSessionText(contract, status) {
  return [
    (contract ?? '').trim(),
    '',
    '## Live pipeline state (from dsh-operator-guard)',
    formatStatus(status),
    '',
    'End this run with `operator_guard_record` — at least one real state change, or a concrete blocker.',
  ].join('\n');
}

/** Last parseable object of a JSONL file, or null. */
export function lastJsonLine(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const lines = text.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim() === '') continue;
    const parsed = parseJsonLine(lines[index]);
    if (parsed !== null) return parsed;
  }
  return null;
}

/** Newest mtime (ms) in a directory matching `filter`, or 0. */
export function newestMtime(dir, filter = () => true) {
  let best = 0;
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of names) {
    if (!filter(name)) continue;
    try {
      const stat = statSync(path.join(dir, name));
      if (stat.isFile() && stat.mtimeMs > best) best = stat.mtimeMs;
    } catch {
      // A vanished file is not a reason to fail the status read.
    }
  }
  return best;
}

/** Append one JSON object as a line; creates the parent directory. Returns the entry as written. */
export function appendJsonLine(file, entry) {
  mkdirSync(path.dirname(file), { recursive: true });
  const line = JSON.stringify(entry);
  appendFileSync(file, `${line}\n`);
  return entry;
}

/** Read a UTF-8 file or return the fallback. */
export function readText(file, fallback = '') {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}
