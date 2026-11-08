import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openLedger } from '../src/ledger.js';
import { pruneQuarantine, quarantineFile, quarantineName, restoreQuarantined, sha256File } from '../src/quarantine.js';

const dirs = [];
function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-quarantine-'));
  dirs.push(dir);
  const media = path.join(dir, 'media');
  const quarantine = path.join(dir, 'quarantine');
  fs.mkdirSync(media);
  fs.mkdirSync(quarantine);
  const file = path.join(media, 'watched.mp4');
  fs.writeFileSync(file, 'hello quarantine');
  const db = openLedger(path.join(dir, 'ledger.db'));
  return { dir, media, quarantine, file, db };
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('quarantine engine', () => {
  it('dry-run reports the plan without touching the file', async () => {
    const { file, quarantine, db } = workspace();
    const plan = await quarantineFile(db, { file, root: quarantine, reason: 'watched+7d' });
    expect(plan.action).toBe('would-quarantine');
    expect(fs.existsSync(file)).toBe(true);
    db.close();
  });

  it('live copy+verify moves the file and records sha256/bytes', async () => {
    const { file, quarantine, db } = workspace();
    const expected = await sha256File(file);
    const result = await quarantineFile(db, { file, root: quarantine, reason: 'watched+7d', mode: 'live' });
    expect(result.action).toBe('quarantined');
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(result.destination)).toBe(true);
    expect(result.sha256).toBe(expected);
    expect(result.destination.endsWith(quarantineName(expected, 'watched.mp4'))).toBe(true);
    expect(db.prepare('SELECT sha256, bytes, state FROM quarantine').get()).toMatchObject({ sha256: expected, state: 'QUARANTINED' });
    db.close();
  });

  it('refuses a quarantine root that does not exist', async () => {
    const { file, dir, db } = workspace();
    await expect(quarantineFile(db, { file, root: path.join(dir, 'missing'), reason: 'x', mode: 'live' })).rejects.toThrow('quarantine root does not exist');
    db.close();
  });

  it('restores with a hash check and marks the row RESTORED', async () => {
    const { dir, file, quarantine, db } = workspace();
    const moved = await quarantineFile(db, { file, root: quarantine, reason: 'x', mode: 'live' });
    const destination = path.join(dir, 'restored', 'watched.mp4');
    const result = await restoreQuarantined(db, { id: moved.id, destination, mode: 'live' });
    expect(result.action).toBe('restored');
    expect(fs.readFileSync(destination, 'utf-8')).toBe('hello quarantine');
    expect(db.prepare('SELECT state FROM quarantine WHERE id = ?').get(moved.id).state).toBe('RESTORED');
    db.close();
  });

  it('prunes oldest rows by cap only inside the quarantine root', async () => {
    const { file, quarantine, db } = workspace();
    const moved = await quarantineFile(db, { file, root: quarantine, reason: 'x', mode: 'live' });
    // A manifest row pointing outside the root must never be pruned by this call.
    db.prepare("INSERT INTO quarantine (path, bytes, reason, state, created_at) VALUES (?, ?, ?, 'QUARANTINED', ?)")
      .run('/data/Movies/keep.mkv', 999, 'external', new Date(0).toISOString());
    const plan = await pruneQuarantine(db, { root: quarantine, maxBytes: 1, mode: 'dry-run' });
    expect(plan.rows).toEqual([moved.id]);
    const applied = await pruneQuarantine(db, { root: quarantine, maxBytes: 1, mode: 'live' });
    expect(applied.rows).toEqual([moved.id]);
    expect(fs.existsSync(moved.destination)).toBe(false);
    expect(db.prepare("SELECT state FROM quarantine WHERE path = '/data/Movies/keep.mkv'").get().state).toBe('QUARANTINED');
    db.close();
  });
});
