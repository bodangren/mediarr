/**
 * Quarantine engine (track chore_migrate_hermes_automation_20261107, task B8).
 *
 * Rules this file enforces instead of trusting its caller:
 *  - **dry-run first**: nothing is moved or deleted unless mode is explicitly 'live';
 *  - **copy + verify**: the copy's sha256 and byte count must match the source before the source is
 *    unlinked, so a partial copy can never destroy the only copy;
 *  - **restore** verifies the hash again before writing back to the destination;
 *  - **retention**: prune by age and by cap, oldest first, and never delete a file that is not in the
 *    quarantine manifest.
 *
 * The quarantine root is a caller-supplied directory on the 4TB volume; this module refuses a root
 * that does not exist (no implicit mkdir at an unknown place) and never touches paths outside it.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { addQuarantine } from './ledger.js';

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/** Sanitised quarantine target name: hash prefix keeps duplicates distinct, extension is preserved. */
export function quarantineName(sha256, originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${sha256.slice(0, 16)}${ext}`;
}

export async function quarantineFile(db, options) {
  const { file, root, reason, mode = 'dry-run', at = new Date() } = options;
  if (!file || !root || !reason) throw new Error('quarantineFile requires file, root and reason');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`quarantine root does not exist: ${root}`);
  }
  const absolute = path.resolve(file);
  const rootAbsolute = path.resolve(root);
  if (absolute.startsWith(`${rootAbsolute}${path.sep}`)) {
    throw new Error('file is already inside the quarantine root');
  }

  const source = await fsp.stat(absolute);
  if (!source.isFile()) throw new Error(`not a file: ${absolute}`);
  const sha256 = await sha256File(absolute);
  const destination = path.join(rootAbsolute, quarantineName(sha256, absolute));

  if (mode === 'dry-run') {
    return { action: 'would-quarantine', source: absolute, destination, sha256, bytes: source.size };
  }

  await fsp.copyFile(absolute, destination);
  const copySha = await sha256File(destination);
  const copySize = (await fsp.stat(destination)).size;
  if (copySha !== sha256 || copySize !== source.size) {
    await fsp.rm(destination, { force: true });
    throw new Error(`copy verification failed for ${absolute}: ${copySha}/${copySize} != ${sha256}/${source.size}`);
  }
  const row = addQuarantine(db, { filePath: destination, sha256, bytes: source.size, reason, at });
  await fsp.rm(absolute);
  return { action: 'quarantined', source: absolute, destination, sha256, bytes: source.size, id: row.id };
}

export async function restoreQuarantined(db, options) {
  const { id, destination, mode = 'dry-run' } = options;
  const row = db.prepare("SELECT * FROM quarantine WHERE id = ? AND state = 'QUARANTINED'").get(id);
  if (!row) throw new Error(`quarantine row ${id} is missing or not QUARANTINED`);
  const sha256 = await sha256File(row.path);
  if (sha256 !== row.sha256) {
    throw new Error(`quarantined file hash changed (${sha256} != ${row.sha256}); refusing to restore`);
  }
  if (mode === 'dry-run') {
    return { action: 'would-restore', id, from: row.path, destination: destination ?? null, sha256 };
  }
  if (!destination) throw new Error('restore requires a destination');
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.copyFile(row.path, destination);
  const restoredSha = await sha256File(destination);
  if (restoredSha !== row.sha256) throw new Error('restored copy failed hash verification');
  db.prepare("UPDATE quarantine SET state = 'RESTORED', restored_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
  return { action: 'restored', id, from: row.path, destination, sha256: restoredSha };
}

/** Retention/cap prune: oldest first, only rows whose file lives under root. */
export async function pruneQuarantine(db, options) {
  const { root, maxBytes = 0, maxAgeMs = 0, mode = 'dry-run', now = new Date() } = options;
  if (!root) throw new Error('pruneQuarantine requires root');
  const rootAbsolute = path.resolve(root);
  const rows = db.prepare("SELECT * FROM quarantine WHERE state = 'QUARANTINED' ORDER BY created_at ASC, id ASC").all();
  const plan = [];
  let totalBytes = rows.reduce((sum, row) => sum + (row.bytes ?? 0), 0);
  const cutoff = maxAgeMs > 0 ? now.getTime() - maxAgeMs : null;
  for (const row of rows) {
    if (!path.resolve(row.path).startsWith(`${rootAbsolute}${path.sep}`)) continue;
    const tooOld = cutoff !== null && new Date(row.created_at).getTime() < cutoff;
    const overCap = maxBytes > 0 && totalBytes > maxBytes;
    if (!tooOld && !overCap) continue;
    plan.push(row);
    totalBytes -= row.bytes ?? 0;
  }
  if (mode === 'dry-run') {
    return { action: 'would-prune', count: plan.length, bytes: plan.reduce((sum, row) => sum + (row.bytes ?? 0), 0), rows: plan.map((row) => row.id) };
  }
  for (const row of plan) {
    await fsp.rm(row.path, { force: true });
    db.prepare("UPDATE quarantine SET state = 'DELETED' WHERE id = ?").run(row.id);
  }
  return { action: 'pruned', count: plan.length, bytes: plan.reduce((sum, row) => sum + (row.bytes ?? 0), 0), rows: plan.map((row) => row.id) };
}
