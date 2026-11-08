import fsp from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Turns the priority coverage gap into wanted-subtitle rows (track
 * feature_subtitle_coverage_priority_20261108).
 *
 * The snapshot tells us which watched variants lack English or Chinese. This queues exactly those
 * languages in WantedSubtitle, which the existing fetch/bilingual cycles consume in viewing-priority
 * order - so agents work on what the owner is watching, not on insertion order.
 */

type Drizzle = any;

export interface VariantCoverage {
  variantId: number;
  english: number;
  chinese: number;
}

export interface WantedAction {
  variantId: number;
  languageCode: 'en' | 'zho';
}

/** Pure decision: one wanted row per missing language, never duplicates within a run. */
export function wantedForGaps(variants: readonly VariantCoverage[]): WantedAction[] {
  const actions: WantedAction[] = [];
  const seen = new Set<string>();
  for (const variant of variants) {
    for (const language of ['en', 'zho'] as const) {
      const present = language === 'en' ? variant.english : variant.chinese;
      if (present > 0) continue;
      const key = `${variant.variantId}:${language}`;
      if (seen.has(key)) continue;
      seen.add(key);
      actions.push({ variantId: variant.variantId, languageCode: language });
    }
  }
  return actions;
}

const ENGLISH = "('en','eng','en-us','en-gb')";
const CHINESE = "('zho','chi','zh','cmn','zh-cn','zh-tw','zh-hk')";

export interface WantedQueueResult {
  at: string;
  variants: number;
  queuedEn: number;
  queuedZho: number;
  actions: WantedAction[];
}

export async function queuePriorityWanted(
  drizzle: Drizzle,
  options: { configDir: string; days?: number; limit?: number },
): Promise<WantedQueueResult> {
  const days = options.days ?? 14;
  const limit = options.limit ?? 200;
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const query = sql`
    SELECT v.id AS variantId,
           SUM(CASE WHEN lower(st.languageCode) IN ${sql.raw(ENGLISH)} THEN 1 ELSE 0 END) AS english,
           SUM(CASE WHEN lower(st.languageCode) IN ${sql.raw(CHINESE)} THEN 1 ELSE 0 END) AS chinese
      FROM MediaFileVariant v
      JOIN (SELECT DISTINCT mediaType, mediaId FROM PlaybackProgress
             WHERE updatedAt >= ${since} OR (isWatched = 0 AND position > 0)) p
        ON ((p.mediaType = 'MOVIE' AND v.movieId = p.mediaId AND v.mediaType = 'MOVIE')
         OR (p.mediaType = 'EPISODE' AND v.episodeId = p.mediaId AND v.mediaType = 'EPISODE'))
      LEFT JOIN VariantSubtitleTrack st ON st.variantId = v.id
     GROUP BY v.id
     LIMIT ${limit}
  `;
  const raw = typeof drizzle.all === 'function' ? await drizzle.all(query) : await drizzle.execute(query);
  const rows: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : (raw.rows ?? []);
  const variants: VariantCoverage[] = rows.map((row) => ({
    variantId: Number(row.variantId),
    english: Number(row.english ?? 0),
    chinese: Number(row.chinese ?? 0),
  }));

  const actions = wantedForGaps(variants);
  let queuedEn = 0;
  let queuedZho = 0;
  for (const action of actions) {
    try {
      await drizzle
        .insert(schema.wantedSubtitles)
        .values({
          variantId: action.variantId,
          languageCode: action.languageCode,
          isForced: false,
          isHi: false,
          state: 'PENDING',
        })
        .onConflictDoNothing();
      if (action.languageCode === 'en') queuedEn += 1;
      else queuedZho += 1;
    } catch {
      // A per-row failure (unique race, stale variant) must not abort the rest; counts stay honest.
    }
  }

  const result: WantedQueueResult = { at: new Date().toISOString(), variants: variants.length, queuedEn, queuedZho, actions };
  await fsp.appendFile(
    path.join(options.configDir, 'subtitle-wanted-receipts.jsonl'),
    `${JSON.stringify(result)}\n`,
  );
  return result;
}
