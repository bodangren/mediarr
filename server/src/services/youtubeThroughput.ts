export interface YoutubeDownloadReceiptLike {
  at?: string | null;
  attempted?: number | null;
  downloaded?: number | null;
}

export interface YoutubeThroughput {
  windowHours: number;
  downloaded: number;
  runs: number;
  perHour: number;
  /** Estimated hours to drain `pending` at the observed rate; null when no downloads happened. */
  etaHours: number | null;
}

/**
 * Recent YouTube download throughput from the append-only receipt file.
 *
 * The queue is CPU-bound on this host (~1–2 videos/hour), so the honest answer to "when will the
 * backlog finish?" is a measured rate, not a promise. Malformed receipt lines are skipped.
 */
export function summarizeYoutubeThroughput(
  receipts: readonly YoutubeDownloadReceiptLike[],
  pending: number,
  now: Date = new Date(),
  windowHours = 24,
): YoutubeThroughput {
  const cutoff = now.getTime() - windowHours * 60 * 60 * 1000;
  let downloaded = 0;
  let runs = 0;
  for (const receipt of receipts) {
    if (!receipt.at) continue;
    const at = Date.parse(receipt.at);
    if (!Number.isFinite(at) || at < cutoff) continue;
    runs += 1;
    downloaded += Math.max(0, Number(receipt.downloaded ?? 0));
  }
  const perHour = downloaded / windowHours;
  return {
    windowHours,
    downloaded,
    runs,
    perHour,
    etaHours: perHour > 0 ? Math.ceil(pending / perHour) : null,
  };
}

/** Parses a JSONL receipt file, ignoring malformed lines. */
export function parseYoutubeDownloadReceipts(text: string): YoutubeDownloadReceiptLike[] {
  const receipts: YoutubeDownloadReceiptLike[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      receipts.push(JSON.parse(trimmed) as YoutubeDownloadReceiptLike);
    } catch {
      // A truncated last line after a crash must not break the queue summary.
    }
  }
  return receipts;
}
