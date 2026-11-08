import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Music ingest bookkeeping (track feature_music_library_20261107, Phase 2).
 *
 * Every ingest attempt appends one JSONL receipt: what was attempted, what happened, and - on failure
 * - the exact tool error. The ledger answers "was this ingested?"; the receipt answers "what did the
 * last runs do?", including duplicates that never reached the ledger.
 */

type Drizzle = any;

export interface IngestReceipt {
  at: string;
  videoId: string;
  status: 'FILED' | 'REVIEW' | 'FAILED' | 'SKIPPED';
  reason: string | null;
  path: string | null;
}

export function receiptPath(configDir: string): string {
  return path.join(configDir, 'music-ingest-receipts.jsonl');
}

export async function appendIngestReceipt(configDir: string, receipt: Omit<IngestReceipt, 'at'>): Promise<IngestReceipt> {
  const full: IngestReceipt = { at: new Date().toISOString(), ...receipt };
  await fsp.appendFile(receiptPath(configDir), `${JSON.stringify(full)}\n`);
  return full;
}

export async function readIngestReceipts(configDir: string, limit = 50): Promise<IngestReceipt[]> {
  try {
    const text = await fsp.readFile(receiptPath(configDir), 'utf-8');
    return text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(-limit)
      .map((line) => JSON.parse(line) as IngestReceipt);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export interface IngestSummary {
  attempted: number;
  filed: number;
  review: number;
  failed: number;
  skipped: number;
}

/** Aggregates receipts so a batch run can report one honest summary line. */
export function summarizeReceipts(receipts: readonly IngestReceipt[]): IngestSummary {
  return {
    attempted: receipts.filter((receipt) => receipt.status !== 'SKIPPED').length,
    filed: receipts.filter((receipt) => receipt.status === 'FILED').length,
    review: receipts.filter((receipt) => receipt.status === 'REVIEW').length,
    failed: receipts.filter((receipt) => receipt.status === 'FAILED').length,
    skipped: receipts.filter((receipt) => receipt.status === 'SKIPPED').length,
  };
}

export interface MusicNightlyReceipt {
  at: string;
  tracks: number;
  artists: number;
  albums: number;
  /** Ingest receipts inside the lookback window, aggregated. */
  ingests: IngestSummary;
  /** True when the library grew since the previous receipt (the receipt is the growth record). */
  libraryComplete: boolean;
}

/** One honest nightly line: library size + what ingest did recently. Pure so it is testable. */
export function buildNightlyReceipt(input: {
  tracks: number;
  artists: number;
  albums: number;
  ingests: readonly IngestReceipt[];
  now?: Date;
}): MusicNightlyReceipt {
  return {
    at: (input.now ?? new Date()).toISOString(),
    tracks: input.tracks,
    artists: input.artists,
    albums: input.albums,
    ingests: summarizeReceipts(input.ingests),
    libraryComplete: input.tracks > 0 && input.albums > 0,
  };
}

export function nightlyReceiptPath(configDir: string): string {
  return path.join(configDir, 'music-nightly-receipts.jsonl');
}

export async function appendNightlyReceipt(configDir: string, receipt: MusicNightlyReceipt): Promise<void> {
  await fsp.appendFile(nightlyReceiptPath(configDir), `${JSON.stringify(receipt)}\n`);
}
