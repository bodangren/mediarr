import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Candidate {
  videoPath: string;
  srtPath: string;
}

/** Sidecar suffixes the pipeline recognises as a Chinese track (`.chi` is never used). */
export const CHINESE_SIDECAR_EXTENSIONS = ['.zho.srt', '.zh.srt'] as const;

/** Legacy `Movie.path`/`Episode.path` may hold a folder; only real files are sync candidates. */
export const MEDIA_FILE_EXTENSIONS = /\.(mp4|mkv|avi|mov|m4v|webm|ts|m2ts|mpg|mpeg|wmv|flv)$/i;

/**
 * Turns video paths into alignment candidates by probing for a sibling Chinese sidecar.
 *
 * The library is variant-based: a movie/episode can have several `MediaFileVariant` paths while the
 * legacy `Movie.path`/`Episode.path` column holds a folder, so callers must pass the **variant**
 * paths (plus legacy paths only when they are real files). Duplicate paths are collapsed.
 */
export function findSidecarCandidates(
  videoPaths: readonly string[],
  exists: (candidatePath: string) => boolean = existsSync,
): Candidate[] {
  const seen = new Set<string>();
  const found: Candidate[] = [];
  for (const videoPath of videoPaths) {
    if (!videoPath || seen.has(videoPath)) continue;
    seen.add(videoPath);
    const base = videoPath.replace(/\.[^.\\/]+$/, '');
    for (const ext of CHINESE_SIDECAR_EXTENSIONS) {
      const srtPath = base + ext;
      if (exists(srtPath)) {
        found.push({ videoPath, srtPath });
        break;
      }
    }
  }
  return found;
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

/**
 * Puts candidates whose videos were played recently first (workstream 1: the background passes walk
 * viewing priority, not insertion order). Order inside each group is preserved.
 */
export function orderCandidatesByRecentPlayback(
  candidates: readonly Candidate[],
  recentVideoPaths: readonly string[],
): Candidate[] {
  const priority = new Map<string, number>();
  recentVideoPaths.forEach((videoPath, index) => {
    if (!priority.has(videoPath)) priority.set(videoPath, index);
  });
  return [...candidates].sort((left, right) => {
    const leftRank = priority.get(left.videoPath);
    const rightRank = priority.get(right.videoPath);
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    return leftRank - rightRank;
  });
}

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

    let scannedInCycle = 0;
    for (const candidate of await this.candidates()) {
      result.scanned += 1;
      scannedInCycle += 1;
      // The candidate list is ~1,800 sidecars and each skip hashes a file. Awaiting fs
      // reads still queues microtasks, so an unyielded pass held the loop for 9.5 s
      // (measured 2026-11-21 00:12, the largest stall of the night after the scan fix).
      if (scannedInCycle % 25 === 0) await new Promise((resolve) => setImmediate(resolve));
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
      // Persist after each candidate: a restart mid-cycle (frequent while the server is being
      // repaired) must not lose completed alignments, otherwise the next cycle redoes them.
      await this.saveState(state);
    }

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
      // Hash the *aligned* output, not the pre-alignment input: storing the old hash made the next
      // cycle see a mismatch and realign the same file again (one wasted double-pass per alignment).
      const alignedSha256 = await sha256File(alignTmp);
      await fs.rename(alignTmp, srtPath);
      await unlinkIfExists(verifyTmp);
      state.entries[srtPath] = {
        status: 'ok',
        srtSha256: alignedSha256,
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

export interface SyncStateSummary {
  attempted: number;
  ok: number;
  gaveUp: number;
  failed: number;
  other: number;
  /** Entries with a `syncedAt` inside the recent window (default 24 h). */
  recentAligned: number;
  /** recentAligned / window hours; 0 when nothing aligned recently. */
  perHour: number;
}

/**
 * Counts the JSON sync ledger so the owner can see how far the background pass has got, plus the
 * recent alignment rate (the pass is CPU-bound and multi-day, so an observed rate beats a promise).
 */
export function summarizeSyncState(raw: unknown, now: Date = new Date(), windowHours = 24): SyncStateSummary {
  const entries = raw && typeof raw === 'object' && 'entries' in raw
    ? (raw as { entries?: unknown }).entries
    : raw;
  const summary: SyncStateSummary = { attempted: 0, ok: 0, gaveUp: 0, failed: 0, other: 0, recentAligned: 0, perHour: 0 };
  if (!entries || typeof entries !== 'object') return summary;
  const cutoff = now.getTime() - windowHours * 60 * 60 * 1000;
  for (const entry of Object.values(entries as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    summary.attempted += 1;
    const status = (entry as { status?: unknown }).status;
    if (status === 'ok') summary.ok += 1;
    else if (status === 'gave_up') summary.gaveUp += 1;
    else if (status === 'failed') summary.failed += 1;
    else summary.other += 1;

    if (status === 'ok') {
      const syncedAt = (entry as { syncedAt?: unknown }).syncedAt;
      const at = typeof syncedAt === 'string' ? Date.parse(syncedAt) : Number.NaN;
      if (Number.isFinite(at) && at >= cutoff) summary.recentAligned += 1;
    }
  }
  summary.perHour = summary.recentAligned / windowHours;
  return summary;
}
