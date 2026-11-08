/**
 * Substrate watchdog (track chore_migrate_hermes_automation_20261107, task B9).
 *
 * Deterministic checks for the things that silently rot: the Mediarr API, the automation
 * heartbeat, bridge tool registration (not port liveness), scheduler task staleness and expected
 * artifact freshness. Each failure is an alert row plus a local JSONL line, so "the automation
 * stopped" is visible within minutes instead of at the next viewing session.
 *
 * Every external effect is injectable, so the checks are unit-tested without network access.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { raiseAlert, readHeartbeat } from './ledger.js';

export function loadExpectations(file) {
  const raw = yaml.load(fs.readFileSync(file, 'utf-8'));
  if (!raw || typeof raw !== 'object') throw new Error(`invalid expectations file: ${file}`);
  return raw;
}

function ageMinutes(then, now) {
  return (now.getTime() - new Date(then).getTime()) / 60000;
}

export async function checkHost(expectations, { fetchImpl = fetch, now = new Date() } = {}) {
  const health = expectations.host?.mediarrHealth;
  if (!health?.url) return { name: 'mediarr-health', ok: false, detail: 'no health url configured' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), health.timeoutMs ?? 5000);
    const response = await fetchImpl(health.url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok
      ? { name: 'mediarr-health', ok: true, detail: `HTTP ${response.status}` }
      : { name: 'mediarr-health', ok: false, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { name: 'mediarr-health', ok: false, detail: `unreachable: ${error.message}` };
  }
}

export function checkHeartbeat(expectations, db, { now = new Date() } = {}) {
  const heartbeat = readHeartbeat(db);
  const maxAge = expectations.host?.maxHeartbeatAgeMinutes ?? 90;
  if (!heartbeat) return { name: 'heartbeat', ok: false, detail: 'no heartbeat recorded' };
  const age = ageMinutes(heartbeat.at, now);
  return age <= maxAge
    ? { name: 'heartbeat', ok: true, detail: `${Math.round(age)} min old` }
    : { name: 'heartbeat', ok: false, detail: `${Math.round(age)} min old (max ${maxAge})` };
}

export function checkBridgeTools(expectations, registeredTools) {
  const required = expectations.bridge?.requiredTools ?? [];
  const missing = required.filter((tool) => !registeredTools.includes(tool));
  return missing.length === 0
    ? { name: 'bridge-tools', ok: true, detail: `${required.length} registered` }
    : { name: 'bridge-tools', ok: false, detail: `missing: ${missing.join(', ')}` };
}

export function checkSchedulerTasks(expectations, tasks, { now = new Date() } = {}) {
  const expected = expectations.scheduler?.expectedTasks ?? [];
  const maxStale = expectations.scheduler?.maxTaskStalenessMinutes ?? 180;
  const failing = [];
  for (const name of expected) {
    const task = tasks.find((candidate) => candidate?.taskName === name || candidate?.name === name);
    if (!task) { failing.push(`${name}: not scheduled`); continue; }
    const last = task.lastRunAt ?? task.startedAt;
    if (!last) continue; // registered but never ran yet (fresh install) is not staleness
    const age = ageMinutes(last, now);
    if (age > maxStale) failing.push(`${name}: ${Math.round(age)} min stale`);
  }
  return failing.length === 0
    ? { name: 'scheduler-tasks', ok: true, detail: `${expected.length} expected tasks fresh` }
    : { name: 'scheduler-tasks', ok: false, detail: failing.join('; ') };
}

export function checkArtifacts(expectations, { now = new Date(), stat = (p) => fs.statSync(p) } = {}) {
  const failing = [];
  for (const artifact of expectations.artifacts ?? []) {
    try {
      const info = stat(artifact.path);
      const ageHours = (now.getTime() - info.mtimeMs) / 3_600_000;
      if (artifact.maxAgeHours && ageHours > artifact.maxAgeHours) {
        failing.push(`${path.basename(artifact.path)} ${Math.round(ageHours)} h old (max ${artifact.maxAgeHours})`);
      }
    } catch {
      failing.push(`${path.basename(artifact.path)} missing`);
    }
  }
  return failing.length === 0
    ? { name: 'artifacts', ok: true, detail: `${(expectations.artifacts ?? []).length} fresh` }
    : { name: 'artifacts', ok: false, detail: failing.join('; ') };
}

export async function runWatchdog(options) {
  const {
    expectations,
    db,
    registeredTools = [],
    tasks = [],
    now = new Date(),
    fetchImpl = fetch,
    stat,
    alertsJsonl,
  } = options;
  const checks = [
    await checkHost(expectations, { fetchImpl, now }),
    checkHeartbeat(expectations, db, { now }),
    checkBridgeTools(expectations, registeredTools),
    checkSchedulerTasks(expectations, tasks, { now }),
    checkArtifacts(expectations, { now, stat }),
  ];
  for (const check of checks.filter((candidate) => !candidate.ok)) {
    raiseAlert(db, {
      level: 'critical',
      code: `WATCHDOG_${check.name.toUpperCase().replace(/-/g, '_')}`,
      message: check.detail,
      at: now,
    }, alertsJsonl);
  }
  return { at: now.toISOString(), ok: checks.every((check) => check.ok), checks };
}
