import fsp from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { coverageStatus, type CoverageStatus } from './SubtitleAuditService';

/**
 * Priority subtitle-coverage snapshot (track feature_subtitle_coverage_priority_20261108).
 *
 * The owner's requirement is not "100% of the library" but "everything I am watching has EN+ZH or an
 * honest reason it does not". This resolves recent/in-progress PlaybackProgress rows to their
 * downloaded subtitle languages, counts dual/zho-only/en-only/none, and appends a receipt so the gap
 * is observable over time without opening a UI.
 */

type Drizzle = any;

export interface CoverageItem {
  mediaType: string;
  mediaId: number;
  status: CoverageStatus;
  english: number;
  chinese: number;
}

export interface CoverageSnapshot {
  at: string;
  days: number;
  items: CoverageItem[];
  counts: Record<CoverageStatus, number>;
}

export function receiptPath(configDir: string): string {
  return path.join(configDir, 'subtitle-coverage-receipts.jsonl');
}

const ENGLISH = "('en','eng','en-us','en-gb')";
const CHINESE = "('zho','chi','zh','cmn','zh-cn','zh-tw','zh-hk')";

export async function snapshotCoverage(
  drizzle: Drizzle,
  options: { configDir: string; days?: number; limit?: number },
): Promise<CoverageSnapshot> {
  const days = options.days ?? 14;
  const limit = options.limit ?? 100;
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const query = sql`
    SELECT p.mediaType AS mediaType,
           p.mediaId AS mediaId,
           SUM(CASE WHEN lower(st.languageCode) IN ${sql.raw(ENGLISH)} THEN 1 ELSE 0 END) AS english,
           SUM(CASE WHEN lower(st.languageCode) IN ${sql.raw(CHINESE)} THEN 1 ELSE 0 END) AS chinese
      FROM PlaybackProgress p
      LEFT JOIN MediaFileVariant v
        ON v.mediaType = p.mediaType
       AND ((p.mediaType = 'MOVIE' AND v.movieId = p.mediaId)
         OR (p.mediaType = 'EPISODE' AND v.episodeId = p.mediaId))
      LEFT JOIN VariantSubtitleTrack st ON st.variantId = v.id
     WHERE p.updatedAt >= ${since} OR (p.isWatched = 0 AND p.position > 0)
     GROUP BY p.mediaType, p.mediaId
     ORDER BY MAX(p.updatedAt) DESC
     LIMIT ${limit}
  `;
  // better-sqlite3 drizzle exposes all()/run(), not execute(); tolerate both shapes.
  const rows = typeof drizzle.all === 'function'
    ? await drizzle.all(query)
    : await drizzle.execute(query);
  const list: Array<Record<string, unknown>> = Array.isArray(rows)
    ? rows as Array<Record<string, unknown>>
    : ((rows as { rows?: Array<Record<string, unknown>> }).rows ?? []);

  const items: CoverageItem[] = list.map((row) => {
    const english = Number(row.english ?? 0);
    const chinese = Number(row.chinese ?? 0);
    const status = coverageStatus([
      ...(english > 0 ? ['en'] : []),
      ...(chinese > 0 ? ['zho'] : []),
    ]);
    return {
      mediaType: String(row.mediaType),
      mediaId: Number(row.mediaId),
      status,
      english,
      chinese,
    };
  });

  const counts: Record<CoverageStatus, number> = { dual: 0, 'zho-only': 0, 'en-only': 0, none: 0 };
  for (const item of items) counts[item.status] += 1;

  const snapshot: CoverageSnapshot = { at: new Date().toISOString(), days, items, counts };
  await fsp.appendFile(receiptPath(options.configDir), `${JSON.stringify(snapshot)}\n`);
  return snapshot;
}

export async function readCoverageReceipts(configDir: string, limit = 20): Promise<CoverageSnapshot[]> {
  try {
    const text = await fsp.readFile(receiptPath(configDir), 'utf-8');
    return text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(-limit)
      .map((line) => JSON.parse(line) as CoverageSnapshot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
