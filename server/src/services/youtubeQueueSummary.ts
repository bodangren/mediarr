export interface YoutubeQueueSummary {
  available: number;
  pending: number;
  downloading: number;
  failed: number;
  quarantined: number;
  total: number;
}

/**
 * Turns `SELECT status, count(*) GROUP BY status` rows into the queue summary the owner-facing report
 * shows. Unknown statuses count toward `total` only, so a new state can never be silently added to
 * "available".
 */
export function summarizeYoutubeQueue(rows: Array<{ status: string; count: number }>): YoutubeQueueSummary {
  const summary: YoutubeQueueSummary = {
    available: 0,
    pending: 0,
    downloading: 0,
    failed: 0,
    quarantined: 0,
    total: 0,
  };
  for (const row of rows) {
    const count = Number.isFinite(row.count) ? row.count : 0;
    summary.total += count;
    switch (row.status) {
      case 'AVAILABLE':
        summary.available += count;
        break;
      case 'PENDING':
        summary.pending += count;
        break;
      case 'DOWNLOADING':
        summary.downloading += count;
        break;
      case 'FAILED':
        summary.failed += count;
        break;
      case 'QUARANTINED':
        summary.quarantined += count;
        break;
    }
  }
  return summary;
}
