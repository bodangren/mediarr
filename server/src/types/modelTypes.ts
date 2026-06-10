import type { InferSelectModel } from 'drizzle-orm';
import type {
  activityEvents,
  appSettings,
  blocklists,
  categories,
  collections,
  customFilters,
  customFormatScores,
  customFormats,
  downloadClients,
  episodes,
  importListExclusions,
  importLists,
  indexerCategories,
  indexerHealthSnapshots,
  indexerReleases,
  indexers,
  media,
  mediaFileVariants,
  movies,
  notifications,
  playbackProgress,
  proxies,
  qualityDefinitions,
  qualityProfiles,
  seasons,
  series,
  subtitleHistories,
  torrentPeers,
  torrents,
  variantAudioTracks,
  variantMissingSubtitles,
  variantSubtitleTracks,
  wantedSubtitles,
} from '../db/schema.js';

/**
 * Inferred from `server/src/db/schema.ts` via Drizzle's `$inferSelect`.
 * Each alias is the row type produced by a `SELECT * FROM <table>` query.
 */
export type Media = InferSelectModel<typeof media>;
export type Series = InferSelectModel<typeof series>;
export type Season = InferSelectModel<typeof seasons>;
export type Episode = InferSelectModel<typeof episodes>;
export type Movie = InferSelectModel<typeof movies>;
export type MediaFileVariant = InferSelectModel<typeof mediaFileVariants>;
export type VariantMissingSubtitle = InferSelectModel<typeof variantMissingSubtitles>;
export type VariantAudioTrack = InferSelectModel<typeof variantAudioTracks>;
export type VariantSubtitleTrack = InferSelectModel<typeof variantSubtitleTracks>;
export type WantedSubtitle = InferSelectModel<typeof wantedSubtitles>;
export type SubtitleHistory = InferSelectModel<typeof subtitleHistories>;
export type QualityProfile = InferSelectModel<typeof qualityProfiles>;
export type Collection = InferSelectModel<typeof collections>;
export type ImportList = InferSelectModel<typeof importLists>;
export type ImportListExclusion = InferSelectModel<typeof importListExclusions>;
export type CustomFilter = InferSelectModel<typeof customFilters>;
export type CustomFormat = InferSelectModel<typeof customFormats>;
export type CustomFormatScore = InferSelectModel<typeof customFormatScores>;
export type QualityDefinition = InferSelectModel<typeof qualityDefinitions>;
export type Indexer = InferSelectModel<typeof indexers>;
export type Proxy = InferSelectModel<typeof proxies>;
export type IndexerCategory = InferSelectModel<typeof indexerCategories>;
export type IndexerRelease = InferSelectModel<typeof indexerReleases>;
export type Category = InferSelectModel<typeof categories>;
export type Torrent = InferSelectModel<typeof torrents>;
export type TorrentPeer = InferSelectModel<typeof torrentPeers>;
export type AppSettings = InferSelectModel<typeof appSettings>;
export type PlaybackProgress = InferSelectModel<typeof playbackProgress>;
export type IndexerHealthSnapshot = InferSelectModel<typeof indexerHealthSnapshots>;
export type ActivityEvent = InferSelectModel<typeof activityEvents>;
export type Notification = InferSelectModel<typeof notifications>;
export type DownloadClient = InferSelectModel<typeof downloadClients>;
export type Blocklist = InferSelectModel<typeof blocklists>;

/**
 * JSON value types for columns stored as text/JSON.
 * Kept here as a small isolated namespace so callers do not depend on the
 * deleted `Prisma.JsonValue` namespace (FR-2.3).
 */
export type PrismaJsonObject = Record<string, unknown>;
export type PrismaJsonArray = unknown[];
export type PrismaJsonValue = string | number | boolean | null | PrismaJsonObject | PrismaJsonArray;
