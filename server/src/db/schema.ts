import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Enums (text-backed) ────────────────────────────────────────────────────────

export const MediaTypeEnum = ["TV", "MOVIE"] as const;
export const VariantMediaTypeEnum = ["EPISODE", "MOVIE"] as const;
export const SubtitleTrackSourceEnum = ["EMBEDDED", "EXTERNAL"] as const;
export const WantedSubtitleStateEnum = [
  "PENDING",
  "SEARCHING",
  "DOWNLOADED",
  "FAILED",
] as const;
export const PlaybackMediaTypeEnum = ["MOVIE", "EPISODE"] as const;

// ─── Tables ──────────────────────────────────────────────────────────────────────

export const qualityProfiles = sqliteTable("QualityProfile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  cutoff: integer("cutoff").notNull().default(0),
  items: text("items", { mode: "json" })
    .notNull()
    .$defaultFn(() => []),
  languageProfileId: integer("languageProfileId"),
});

export const media = sqliteTable("Media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaType: text("mediaType", { enum: MediaTypeEnum }).notNull(),
  tmdbId: integer("tmdbId"),
  tvdbId: integer("tvdbId"),
  imdbId: text("imdbId").unique(),
  title: text("title").notNull(),
  cleanTitle: text("cleanTitle").notNull(),
  sortTitle: text("sortTitle").notNull(),
  status: text("status").notNull(),
  overview: text("overview"),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
  qualityProfileId: integer("qualityProfileId")
    .notNull()
    .references(() => qualityProfiles.id),
  path: text("path"),
  year: integer("year").notNull(),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  availability: text("availability"),
  minimumAvailability: text("minimumAvailability"),
  inCinemas: integer("inCinemas", { mode: "timestamp" }),
  digitalRelease: integer("digitalRelease", { mode: "timestamp" }),
  physicalRelease: integer("physicalRelease", { mode: "timestamp" }),
  network: text("network"),
}, (table) => [
  uniqueIndex("Media_mediaType_tmdbId_key").on(table.mediaType, table.tmdbId),
  uniqueIndex("Media_mediaType_tvdbId_key").on(table.mediaType, table.tvdbId),
]);

export const series = sqliteTable("Series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaId: integer("mediaId").unique().references(() => media.id, {
    onDelete: "set null",
  }),
  tvdbId: integer("tvdbId").notNull().unique(),
  tmdbId: integer("tmdbId").unique(),
  imdbId: text("imdbId").unique(),
  title: text("title").notNull(),
  cleanTitle: text("cleanTitle").notNull(),
  sortTitle: text("sortTitle").notNull(),
  status: text("status").notNull(),
  overview: text("overview"),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
  qualityProfileId: integer("qualityProfileId")
    .notNull()
    .references(() => qualityProfiles.id),
  path: text("path"),
  year: integer("year").notNull(),
  network: text("network"),
  posterUrl: text("posterUrl"),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const seasons = sqliteTable("Season", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: integer("seriesId")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  seasonNumber: integer("seasonNumber").notNull(),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
}, (table) => [
  uniqueIndex("Season_seriesId_seasonNumber_key").on(
    table.seriesId,
    table.seasonNumber,
  ),
]);

export const episodes = sqliteTable("Episode", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: integer("seriesId")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  seasonId: integer("seasonId").references(() => seasons.id, {
    onDelete: "set null",
  }),
  tvdbId: integer("tvdbId").notNull().unique(),
  seasonNumber: integer("seasonNumber").notNull(),
  episodeNumber: integer("episodeNumber").notNull(),
  title: text("title").notNull(),
  airDateUtc: integer("airDateUtc", { mode: "timestamp" }),
  overview: text("overview"),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
  path: text("path"),
});

export const movies = sqliteTable("Movie", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaId: integer("mediaId").unique().references(() => media.id, {
    onDelete: "set null",
  }),
  tmdbId: integer("tmdbId").notNull().unique(),
  imdbId: text("imdbId").unique(),
  title: text("title").notNull(),
  cleanTitle: text("cleanTitle").notNull(),
  sortTitle: text("sortTitle").notNull(),
  status: text("status").notNull(),
  overview: text("overview"),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
  qualityProfileId: integer("qualityProfileId")
    .notNull()
    .references(() => qualityProfiles.id),
  languageProfileId: integer("languageProfileId"),
  path: text("path"),
  year: integer("year").notNull(),
  posterUrl: text("posterUrl"),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  minimumAvailability: text("minimumAvailability"),
  inCinemas: integer("inCinemas", { mode: "timestamp" }),
  digitalRelease: integer("digitalRelease", { mode: "timestamp" }),
  physicalRelease: integer("physicalRelease", { mode: "timestamp" }),
  collectionId: integer("collectionId").references(() => collections.id),
});

export const collections = sqliteTable("Collection", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tmdbCollectionId: integer("tmdbCollectionId").notNull().unique(),
  name: text("name").notNull(),
  overview: text("overview"),
  posterPath: text("posterPath"),
  backdropPath: text("backdropPath"),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(false),
  qualityProfileId: integer("qualityProfileId").references(
    () => qualityProfiles.id,
  ),
  rootFolderPath: text("rootFolderPath"),
  addMoviesAutomatically: integer("addMoviesAutomatically", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  searchOnAdd: integer("searchOnAdd", { mode: "boolean" })
    .notNull()
    .default(false),
  minimumAvailability: text("minimumAvailability")
    .notNull()
    .default("released"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const mediaFileVariants = sqliteTable("MediaFileVariant", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaType: text("mediaType", { enum: VariantMediaTypeEnum }).notNull(),
  movieId: integer("movieId").references(() => movies.id, {
    onDelete: "cascade",
  }),
  episodeId: integer("episodeId").references(() => episodes.id, {
    onDelete: "cascade",
  }),
  path: text("path").notNull(),
  fileSize: integer("fileSize").notNull(),
  monitored: integer("monitored", { mode: "boolean" })
    .notNull()
    .default(true),
  probeFingerprint: text("probeFingerprint"),
  releaseName: text("releaseName"),
  quality: text("quality"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("MediaFileVariant_mediaType_path_key").on(
    table.mediaType,
    table.path,
  ),
  index("MediaFileVariant_movieId_idx").on(table.movieId),
  index("MediaFileVariant_episodeId_idx").on(table.episodeId),
]);

export const variantMissingSubtitles = sqliteTable("VariantMissingSubtitle", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variantId")
    .notNull()
    .references(() => mediaFileVariants.id, { onDelete: "cascade" }),
  languageCode: text("languageCode").notNull(),
  isForced: integer("isForced", { mode: "boolean" }).notNull().default(false),
  isHi: integer("isHi", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  uniqueIndex("VariantMissingSubtitle_variantId_languageCode_isForced_isHi_key").on(
    table.variantId,
    table.languageCode,
    table.isForced,
    table.isHi,
  ),
  index("VariantMissingSubtitle_variantId_idx").on(table.variantId),
]);

export const variantAudioTracks = sqliteTable("VariantAudioTrack", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variantId")
    .notNull()
    .references(() => mediaFileVariants.id, { onDelete: "cascade" }),
  streamIndex: integer("streamIndex").notNull(),
  languageCode: text("languageCode"),
  codec: text("codec"),
  channels: text("channels"),
  isDefault: integer("isDefault", { mode: "boolean" }).notNull().default(false),
  isForced: integer("isForced", { mode: "boolean" }).notNull().default(false),
  isCommentary: integer("isCommentary", { mode: "boolean" })
    .notNull()
    .default(false),
  name: text("name"),
}, (table) => [
  uniqueIndex("VariantAudioTrack_variantId_streamIndex_key").on(
    table.variantId,
    table.streamIndex,
  ),
  index("VariantAudioTrack_languageCode_idx").on(table.languageCode),
]);

export const variantSubtitleTracks = sqliteTable("VariantSubtitleTrack", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variantId")
    .notNull()
    .references(() => mediaFileVariants.id, { onDelete: "cascade" }),
  source: text("source", { enum: SubtitleTrackSourceEnum }).notNull(),
  streamIndex: integer("streamIndex"),
  languageCode: text("languageCode"),
  isForced: integer("isForced", { mode: "boolean" }).notNull().default(false),
  isHi: integer("isHi", { mode: "boolean" }).notNull().default(false),
  codec: text("codec"),
  filePath: text("filePath"),
  fileSize: integer("fileSize", ),
}, (table) => [
  index("VariantSubtitleTrack_variantId_idx").on(table.variantId),
  index("VariantSubtitleTrack_languageCode_idx").on(table.languageCode),
]);

export const wantedSubtitles = sqliteTable("WantedSubtitle", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variantId")
    .notNull()
    .references(() => mediaFileVariants.id, { onDelete: "cascade" }),
  languageCode: text("languageCode").notNull(),
  isForced: integer("isForced", { mode: "boolean" }).notNull().default(false),
  isHi: integer("isHi", { mode: "boolean" }).notNull().default(false),
  state: text("state", { enum: WantedSubtitleStateEnum })
    .notNull()
    .default("PENDING"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("WantedSubtitle_variantId_languageCode_isForced_isHi_key").on(
    table.variantId,
    table.languageCode,
    table.isForced,
    table.isHi,
  ),
  index("WantedSubtitle_state_idx").on(table.state),
]);

export const subtitleHistories = sqliteTable("SubtitleHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  variantId: integer("variantId")
    .notNull()
    .references(() => mediaFileVariants.id, { onDelete: "cascade" }),
  wantedSubtitleId: integer("wantedSubtitleId").references(
    () => wantedSubtitles.id,
    { onDelete: "set null" },
  ),
  languageCode: text("languageCode").notNull(),
  provider: text("provider"),
  score: real("score"),
  storedPath: text("storedPath"),
  message: text("message"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  index("SubtitleHistory_variantId_idx").on(table.variantId),
  index("SubtitleHistory_wantedSubtitleId_idx").on(table.wantedSubtitleId),
]);

export const customFilters = sqliteTable("CustomFilter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  conditions: text("conditions", { mode: "json" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("CustomFilter_name_type_key").on(table.name, table.type),
  index("CustomFilter_type_idx").on(table.type),
]);

export const customFormats = sqliteTable("CustomFormat", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  includeCustomFormatWhenRenaming: integer(
    "includeCustomFormatWhenRenaming",
    { mode: "boolean" },
  )
    .notNull()
    .default(false),
  conditions: text("conditions", { mode: "json" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const customFormatScores = sqliteTable("CustomFormatScore", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customFormatId: integer("customFormatId")
    .notNull()
    .references(() => customFormats.id, { onDelete: "cascade" }),
  qualityProfileId: integer("qualityProfileId")
    .notNull()
    .references(() => qualityProfiles.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
}, (table) => [
  uniqueIndex("CustomFormatScore_customFormatId_qualityProfileId_key").on(
    table.customFormatId,
    table.qualityProfileId,
  ),
]);

export const qualityDefinitions = sqliteTable("QualityDefinition", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  resolution: integer("resolution").notNull().default(0),
  title: text("title"),
  weight: integer("weight").notNull().default(0),
});

export const indexers = sqliteTable("Indexer", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  implementation: text("implementation").notNull(),
  configContract: text("configContract").notNull(),
  settings: text("settings").notNull(),
  protocol: text("protocol").notNull(),
  supportedMediaTypes: text("supportedMediaTypes").notNull().default("[]"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  supportsRss: integer("supportsRss", { mode: "boolean" })
    .notNull()
    .default(false),
  supportsSearch: integer("supportsSearch", { mode: "boolean" })
    .notNull()
    .default(false),
  priority: integer("priority").notNull().default(25),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const proxies = sqliteTable("Proxy", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  hostname: text("hostname").notNull(),
  port: integer("port").notNull(),
  username: text("username"),
  password: text("password"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const indexerCategories = sqliteTable("IndexerCategory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  minSize: integer("minSize"),
  maxSize: integer("maxSize"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const indexerReleases = sqliteTable("IndexerRelease", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guid: text("guid").notNull().unique(),
  indexerId: integer("indexerId")
    .notNull()
    .references(() => indexers.id),
  title: text("title").notNull(),
  size: integer("size", ),
  downloadUrl: text("downloadUrl"),
  infoUrl: text("infoUrl"),
  magnetUrl: text("magnetUrl"),
  publishDate: integer("publishDate", { mode: "timestamp" }).notNull(),
  seeders: integer("seeders"),
  leechers: integer("leechers"),
  protocol: text("protocol").notNull(),
  categories: text("categories").notNull(),
  indexerFlags: text("indexerFlags"),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const categories = sqliteTable("Category", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  parent_id: integer("parent_id"),
});

export const torrents = sqliteTable("Torrent", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  infoHash: text("infoHash").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  progress: real("progress").notNull().default(0),
  downloadSpeed: real("downloadSpeed").notNull().default(0),
  uploadSpeed: real("uploadSpeed").notNull().default(0),
  eta: integer("eta"),
  size: integer("size", ).notNull(),
  downloaded: integer("downloaded", ).notNull().default(sql`0`),
  uploaded: integer("uploaded", ).notNull().default(sql`0`),
  ratio: real("ratio").notNull().default(0),
  path: text("path").notNull(),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  stopAtRatio: real("stopAtRatio"),
  stopAtTime: integer("stopAtTime"),
  magnetUrl: text("magnetUrl"),
  torrentFile: blob("torrentFile"),
  episodeId: integer("episodeId"),
  movieId: integer("movieId"),
});

export const torrentPeers = sqliteTable("TorrentPeer", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  torrentId: integer("torrentId")
    .notNull()
    .references(() => torrents.id, { onDelete: "cascade" }),
  ip: text("ip").notNull(),
  port: integer("port").notNull(),
  client: text("client"),
});

export const appSettings = sqliteTable("AppSettings", {
  id: integer("id").primaryKey().default(1),
  torrentLimits: text("torrentLimits", { mode: "json" }).notNull(),
  schedulerIntervals: text("schedulerIntervals", { mode: "json" }).notNull(),
  pathVisibility: text("pathVisibility", { mode: "json" }).notNull(),
  apiKeys: text("apiKeys", { mode: "json" }),
  host: text("host", { mode: "json" }),
  security: text("security", { mode: "json" }),
  logging: text("logging", { mode: "json" }),
  update: text("update", { mode: "json" }),
  mediaManagement: text("mediaManagement", { mode: "json" }),
  streaming: text("streaming", { mode: "json" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const playbackProgress = sqliteTable("PlaybackProgress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mediaType: text("mediaType", { enum: PlaybackMediaTypeEnum }).notNull(),
  mediaId: integer("mediaId").notNull(),
  userId: text("userId").notNull(),
  position: integer("position").notNull().default(0),
  duration: integer("duration").notNull().default(0),
  progress: real("progress").notNull().default(0),
  isWatched: integer("isWatched", { mode: "boolean" }).notNull().default(false),
  lastWatched: integer("lastWatched", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("PlaybackProgress_mediaType_mediaId_userId_key").on(
    table.mediaType,
    table.mediaId,
    table.userId,
  ),
  index("PlaybackProgress_mediaType_mediaId_idx").on(
    table.mediaType,
    table.mediaId,
  ),
  index("PlaybackProgress_userId_idx").on(table.userId),
]);

export const indexerHealthSnapshots = sqliteTable("IndexerHealthSnapshot", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  indexerId: integer("indexerId")
    .notNull()
    .unique()
    .references(() => indexers.id, { onDelete: "cascade" }),
  lastSuccessAt: integer("lastSuccessAt", { mode: "timestamp" }),
  lastFailureAt: integer("lastFailureAt", { mode: "timestamp" }),
  failureCount: integer("failureCount").notNull().default(0),
  lastErrorMessage: text("lastErrorMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const activityEvents = sqliteTable("ActivityEvent", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("eventType").notNull(),
  sourceModule: text("sourceModule").notNull(),
  entityRef: text("entityRef"),
  summary: text("summary").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  details: text("details", { mode: "json" }),
  occurredAt: integer("occurredAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  index("ActivityEvent_eventType_occurredAt_idx").on(
    table.eventType,
    table.occurredAt,
  ),
  index("ActivityEvent_sourceModule_occurredAt_idx").on(
    table.sourceModule,
    table.occurredAt,
  ),
  index("ActivityEvent_entityRef_idx").on(table.entityRef),
  index("ActivityEvent_success_occurredAt_idx").on(
    table.success,
    table.occurredAt,
  ),
]);

export const notifications = sqliteTable("Notification", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  onGrab: integer("onGrab", { mode: "boolean" }).notNull().default(false),
  onDownload: integer("onDownload", { mode: "boolean" })
    .notNull()
    .default(false),
  onUpgrade: integer("onUpgrade", { mode: "boolean" })
    .notNull()
    .default(false),
  onRename: integer("onRename", { mode: "boolean" }).notNull().default(false),
  onSeriesAdd: integer("onSeriesAdd", { mode: "boolean" })
    .notNull()
    .default(false),
  onEpisodeDelete: integer("onEpisodeDelete", { mode: "boolean" })
    .notNull()
    .default(false),
  config: text("config", { mode: "json" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
});

export const downloadClients = sqliteTable("DownloadClient", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  protocol: text("protocol").notNull(),
  type: text("type").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(25),
  config: text("config").notNull(),
  added: integer("added", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  index("DownloadClient_protocol_idx").on(table.protocol),
  index("DownloadClient_enabled_idx").on(table.enabled),
]);

export const blocklists = sqliteTable("Blocklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seriesId: integer("seriesId"),
  seriesTitle: text("seriesTitle").notNull(),
  episodeId: integer("episodeId"),
  seasonNumber: integer("seasonNumber"),
  episodeNumber: integer("episodeNumber"),
  releaseTitle: text("releaseTitle").notNull(),
  quality: text("quality"),
  indexer: text("indexer"),
  size: integer("size", ),
  reason: text("reason").notNull(),
  dateBlocked: integer("dateBlocked", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  index("Blocklist_seriesId_idx").on(table.seriesId),
  index("Blocklist_dateBlocked_idx").on(table.dateBlocked),
]);

export const importLists = sqliteTable("ImportList", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  providerType: text("providerType").notNull(),
  config: text("config", { mode: "json" }).notNull(),
  rootFolderPath: text("rootFolderPath").notNull(),
  qualityProfileId: integer("qualityProfileId")
    .notNull()
    .references(() => qualityProfiles.id),
  languageProfileId: integer("languageProfileId"),
  monitorType: text("monitorType").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  syncInterval: integer("syncInterval").notNull().default(24),
  lastSyncAt: integer("lastSyncAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("ImportList_enabled_idx").on(table.enabled),
]);

export const importListExclusions = sqliteTable("ImportListExclusion", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  importListId: integer("importListId").references(() => importLists.id, {
    onDelete: "cascade",
  }),
  tmdbId: integer("tmdbId"),
  imdbId: text("imdbId"),
  tvdbId: integer("tvdbId"),
  title: text("title").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
}, (table) => [
  uniqueIndex("ImportListExclusion_tmdbId_imdbId_tvdbId_key").on(
    table.tmdbId,
    table.imdbId,
    table.tvdbId,
  ),
  index("ImportListExclusion_tmdbId_idx").on(table.tmdbId),
  index("ImportListExclusion_importListId_idx").on(table.importListId),
]);
