/**
 * The media-automation ledger (track chore_migrate_hermes_automation_20261107, task B4).
 *
 * Frozen schema: `runs` (taskId+attempt, retryOf), `jobs`, `locks` (incl. the browser lock),
 * `alerts`, `quarantine`, plus a single-row `heartbeat`. Every scheduled agent run and helper tool
 * books into this file; it is the durable answer to "did the automation run, and what happened?".
 *
 * SQLite via node:sqlite, no native dependency, so the harness can own it without a build step.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  retry_of INTEGER,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED','SKIPPED')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  outcome TEXT,
  summary TEXT,
  artifacts_json TEXT,
  UNIQUE (task_id, attempt)
);
CREATE INDEX IF NOT EXISTS runs_task_idx ON runs (task_id, started_at DESC);
CREATE TABLE IF NOT EXISTS jobs (
  name TEXT PRIMARY KEY,
  schedule TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_status TEXT
);
CREATE TABLE IF NOT EXISTS locks (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK (level IN ('info','warning','critical')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
CREATE TABLE IF NOT EXISTS quarantine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  sha256 TEXT,
  bytes INTEGER,
  reason TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUARANTINED' CHECK (state IN ('QUARANTINED','RESTORED','DELETED')),
  created_at TEXT NOT NULL,
  restored_at TEXT
);
CREATE TABLE IF NOT EXISTS heartbeat (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  at TEXT NOT NULL,
  host TEXT NOT NULL,
  detail TEXT
);
`;

/** Opens (creating if needed) the ledger and applies the frozen schema. Idempotent. */
export function openLedger(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(SCHEMA_SQL);
  const row = db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version');
  if (!row) {
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('version', String(SCHEMA_VERSION));
    return { from: 0, to: SCHEMA_VERSION };
  }
  if (Number(row.value) > SCHEMA_VERSION) {
    throw new Error(`ledger schema ${row.value} is newer than this plugin (${SCHEMA_VERSION})`);
  }
  return { from: Number(row.value), to: SCHEMA_VERSION };
}

export function schemaVersion(db) {
  const row = db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version');
  return row ? Number(row.value) : 0;
}

export function startRun(db, { taskId, attempt = 1, retryOf = null, startedAt = new Date() }) {
  db.prepare(
    `INSERT INTO runs (task_id, attempt, retry_of, status, started_at)
     VALUES (?, ?, ?, 'RUNNING', ?)
     ON CONFLICT (task_id, attempt) DO UPDATE SET status = 'RUNNING', started_at = excluded.started_at, finished_at = NULL`,
  ).run(taskId, attempt, retryOf, new Date(startedAt).toISOString());
  return db.prepare('SELECT * FROM runs WHERE task_id = ? AND attempt = ?').get(taskId, attempt);
}

export function finishRun(db, { taskId, attempt = 1, status, outcome = null, summary = null, artifacts = null, finishedAt = new Date() }) {
  if (!['SUCCEEDED', 'FAILED', 'SKIPPED'].includes(status)) {
    throw new Error(`invalid run status: ${status}`);
  }
  db.prepare(
    `UPDATE runs SET status = ?, outcome = ?, summary = ?, artifacts_json = ?, finished_at = ?
     WHERE task_id = ? AND attempt = ?`,
  ).run(status, outcome, summary, artifacts === null ? null : JSON.stringify(artifacts), new Date(finishedAt).toISOString(), taskId, attempt);
  const row = db.prepare('SELECT * FROM runs WHERE task_id = ? AND attempt = ?').get(taskId, attempt);
  if (!row) throw new Error(`run ${taskId}#${attempt} not found`);
  return row;
}

export function registerJob(db, { name, schedule = null }) {
  db.prepare(
    `INSERT INTO jobs (name, schedule) VALUES (?, ?)
     ON CONFLICT (name) DO UPDATE SET schedule = COALESCE(excluded.schedule, jobs.schedule)`,
  ).run(name, schedule);
  return db.prepare('SELECT * FROM jobs WHERE name = ?').get(name);
}

export function recordJobRun(db, { name, status, at = new Date() }) {
  db.prepare('UPDATE jobs SET last_run_at = ?, last_status = ? WHERE name = ?').run(new Date(at).toISOString(), status, name);
}

/** Single-row heartbeat: "the automation brain was alive at". */
export function recordHeartbeat(db, { host, detail = null, at = new Date() }) {
  db.prepare(
    `INSERT INTO heartbeat (id, at, host, detail) VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET at = excluded.at, host = excluded.host, detail = excluded.detail`,
  ).run(new Date(at).toISOString(), host, detail);
  return readHeartbeat(db);
}

export function readHeartbeat(db) {
  return db.prepare('SELECT at, host, detail FROM heartbeat WHERE id = 1').get() ?? null;
}

/**
 * Local-first alert: the ledger row is the source of truth, and the JSONL writer runs first so a
 * failed delivery can never lose the alert (design "never silently wrong").
 */
export function raiseAlert(db, { level, code, message, context = null, at = new Date() }, jsonlPath = null) {
  const createdAt = new Date(at).toISOString();
  if (jsonlPath) {
    fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
    fs.appendFileSync(jsonlPath, `${JSON.stringify({ at: createdAt, level, code, message, context })}\n`);
  }
  const result = db.prepare(
    'INSERT INTO alerts (level, code, message, context_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(level, code, message, context === null ? null : JSON.stringify(context), createdAt);
  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);
}

export function listAlerts(db, { status = null, limit = 20 } = {}) {
  if (status) return db.prepare('SELECT * FROM alerts WHERE status = ? ORDER BY id DESC LIMIT ?').all(status, limit);
  return db.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT ?').all(limit);
}

export function acquireLock(db, { name, owner, ttlMs = 60 * 60 * 1000, now = new Date() }) {
  const current = db.prepare('SELECT * FROM locks WHERE name = ?').get(name);
  const at = new Date(now).toISOString();
  if (current && new Date(current.expires_at).getTime() > new Date(now).getTime()) return { acquired: false, holder: current };
  db.prepare(
    `INSERT INTO locks (name, owner, acquired_at, expires_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET owner = excluded.owner, acquired_at = excluded.acquired_at, expires_at = excluded.expires_at`,
  ).run(name, owner, at, new Date(new Date(now).getTime() + ttlMs).toISOString());
  return { acquired: true, holder: db.prepare('SELECT * FROM locks WHERE name = ?').get(name) };
}

export function releaseLock(db, { name, owner }) {
  const current = db.prepare('SELECT owner FROM locks WHERE name = ?').get(name);
  if (!current || current.owner !== owner) return false;
  db.prepare('DELETE FROM locks WHERE name = ?').run(name);
  return true;
}

export function addQuarantine(db, { filePath, sha256 = null, bytes = null, reason, at = new Date() }) {
  db.prepare(
    'INSERT INTO quarantine (path, sha256, bytes, reason, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(filePath, sha256, bytes, reason, new Date(at).toISOString());
  return db.prepare('SELECT * FROM quarantine ORDER BY id DESC LIMIT 1').get();
}

export function ledgerCounts(db) {
  const one = (sql) => Number(db.prepare(sql).get().n);
  return {
    schemaVersion: schemaVersion(db),
    runs: one('SELECT count(*) n FROM runs'),
    running: one("SELECT count(*) n FROM runs WHERE status = 'RUNNING'"),
    failed: one("SELECT count(*) n FROM runs WHERE status = 'FAILED'"),
    jobs: one('SELECT count(*) n FROM jobs'),
    pendingAlerts: one("SELECT count(*) n FROM alerts WHERE status = 'PENDING'"),
    quarantined: one("SELECT count(*) n FROM quarantine WHERE state = 'QUARANTINED'"),
    heartbeat: readHeartbeat(db),
  };
}
