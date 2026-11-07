import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Candidate {
  videoPath: string;
  srtPath: string;
}

export interface AlignResult {
  offsetSeconds: number;
  scale: number;
}

/** Runs one alignment and reports the measured offset/scale it applied. */
export interface Aligner {
  run(videoPath: string, inputSrt: string, outputSrt: string): Promise<AlignResult>;
}

export type SyncStatus = 'ok' | 'failed' | 'gave_up';

export interface SyncEntry {
  status: SyncStatus;
  srtSha256?: string;
  videoSize?: number;
  offsetSeconds?: number;
  scale?: number;
  attempts: number;
  lastError?: string;
  syncedAt?: string;
}

interface SyncState {
  version: 1;
  entries: Record<string, SyncEntry>;
}

export interface CycleResult {
  scanned: number;
  aligned: number;
  skipped: number;
  failed: number;
}

export interface SubtitleSyncOptions {
  statePath: string;
  candidates: () => Promise<Candidate[]>;
  aligner: Aligner;
  limit?: number;
  maxAttempts?: number;
  now?: () => Date;
}

/** Verification bounds: a second alignment pass must measure near-zero. */
export const MAX_RESIDUAL_SECONDS = 0.3;
export const MAX_SCALE_DELTA = 0.02;

const DEFAULT_LIMIT = 5;
const DEFAULT_MAX_ATTEMPTS = 3;

function isSyncEntry(value: unknown): value is SyncEntry {
  return typeof value === 'object' && value !== null && typeof (value as SyncEntry).status === 'string';
}

function loadStateFrom(text: string | null): SyncState {
  if (!text) return { version: 1, entries: {} };
  try {
    const parsed = JSON.parse(text) as Partial<SyncState>;
    if (parsed.version !== 1 || typeof parsed.entries !== 'object' || parsed.entries === null) {
      return { version: 1, entries: {} };
    }
    const entries: Record<string, SyncEntry> = {};
    for (const [key, value] of Object.entries(parsed.entries)) {
      if (isSyncEntry(value)) entries[key] = value;
    }
    return { version: 1, entries };
  } catch {
    return { version: 1, entries: {} };
  }
}

async function sha256File(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    /* already gone */
  }
}

/**
 * Aligns existing Chinese subtitle sidecars to their media and records durable
 * sync state. Deterministic, idempotent (keyed by sidecar content hash + video
 * size), and bounded per cycle. Unalignable sidecars are left untouched and
 * reported; after `maxAttempts` they are marked `gave_up` so they stop churning.
 */
export class SubtitleSyncService {
  private readonly statePath: string;
  private readonly candidates: () => Promise<Candidate[]>;
  private readonly aligner: Aligner;
  private readonly limit: number;
  private readonly maxAttempts: number;
  private readonly now: () => Date;

  constructor(options: SubtitleSyncOptions) {
    this.statePath = options.statePath;
    this.candidates = options.candidates;
    this.aligner = options.aligner;
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.now = options.now ?? (() => new Date());
  }

  async runCycle(options: { limit?: number } = {}): Promise<CycleResult> {
    const limit = options.limit ?? this.limit;
    const state = await this.loadState();
    const result: CycleResult = { scanned: 0, aligned: 0, skipped: 0, failed: 0 };

    for (const candidate of await this.candidates()) {
      result.scanned += 1;
      const key = candidate.srtPath;
      const entry = state.entries[key];
      if (entry && entry.status === 'gave_up') {
        result.skipped += 1;
        continue;
      }
      if (entry && entry.status === 'ok' && entry.srtSha256 !== undefined && entry.videoSize !== undefined) {
        const [hash, size] = await Promise.all([sha256File(candidate.srtPath), this.videoSize(candidate.videoPath)]);
        if (hash === entry.srtSha256 && size === entry.videoSize) {
          result.skipped += 1;
          continue;
        }
      }
      if (result.aligned + result.failed >= limit) break;
      const outcome = await this.alignOne(candidate, entry, state);
      if (outcome === 'aligned') result.aligned += 1;
      else result.failed += 1;
    }

    await this.saveState(state);
    return result;
  }

  private async videoSize(videoPath: string): Promise<number> {
    try {
      return (await fs.stat(videoPath)).size;
    } catch {
      return -1;
    }
  }

  private async alignOne(
    candidate: Candidate,
    previous: SyncEntry | undefined,
    state: SyncState,
  ): Promise<'aligned' | 'failed'> {
    const { videoPath, srtPath } = candidate;
    const alignTmp = `${srtPath}.sync.srt`;
    const verifyTmp = `${srtPath}.verify.srt`;
    const baseEntry: SyncEntry = {
      status: 'failed',
      attempts: (previous?.attempts ?? 0) + 1,
    };
    try {
      const srtSha256 = await sha256File(srtPath);
      const videoSize = await this.videoSize(videoPath);
      const first = await this.aligner.run(videoPath, srtPath, alignTmp);
      const verify = await this.aligner.run(videoPath, alignTmp, verifyTmp);
      const residualTooLarge = Math.abs(verify.offsetSeconds) > MAX_RESIDUAL_SECONDS;
      const scaleTooLarge = Math.abs(verify.scale - 1) > MAX_SCALE_DELTA;
      if (residualTooLarge || scaleTooLarge || Math.abs(first.offsetSeconds) > 600) {
        throw new Error(
          `verification failed: offset=${verify.offsetSeconds}s scale=${verify.scale}`,
        );
      }
      if (!(await exists(srtPath + '.orig'))) {
        await fs.copyFile(srtPath, srtPath + '.orig');
      }
      await fs.rename(alignTmp, srtPath);
      await unlinkIfExists(verifyTmp);
      state.entries[srtPath] = {
        status: 'ok',
        srtSha256,
        videoSize,
        offsetSeconds: verify.offsetSeconds,
        scale: verify.scale,
        attempts: baseEntry.attempts,
        syncedAt: this.now().toISOString(),
      };
      return 'aligned';
    } catch (error) {
      await Promise.all([unlinkIfExists(alignTmp), unlinkIfExists(verifyTmp)]);
      const attempts = baseEntry.attempts;
      state.entries[srtPath] = {
        ...baseEntry,
        attempts,
        status: attempts >= this.maxAttempts ? 'gave_up' : 'failed',
        lastError: error instanceof Error ? error.message : String(error),
      };
      return 'failed';
    }
  }

  private async loadState(): Promise<SyncState> {
    try {
      return loadStateFrom(await fs.readFile(this.statePath, 'utf-8'));
    } catch {
      return { version: 1, entries: {} };
    }
  }

  private async saveState(state: SyncState): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    const tmp = `${this.statePath}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
    await fs.rename(tmp, this.statePath);
  }
}
