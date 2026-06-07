// Re-exports of model type aliases previously provided by the Prisma shim.
// These are `any` because the Prisma shim defined them as `any`.
// Remove individual aliases once no file imports them.

export type Media = any;
export type Series = any;
export type Season = any;
export type Episode = any;
export type Movie = any;
export type MediaFileVariant = any;
export type VariantMissingSubtitle = any;
export type VariantAudioTrack = any;
export type VariantSubtitleTrack = any;
export type WantedSubtitle = any;
export type SubtitleHistory = any;
export type QualityProfile = any;
export type Collection = any;
export type ImportList = any;
export type ImportListExclusion = any;
export type CustomFilter = any;
export type CustomFormat = any;
export type CustomFormatScore = any;
export type QualityDefinition = any;
export type Indexer = any;
export type Proxy = any;
export type IndexerCategory = any;
export type IndexerRelease = any;
export type Category = any;
export type Torrent = any;
export type TorrentPeer = any;
export type AppSettings = any;
export type PlaybackProgress = any;
export type IndexerHealthSnapshot = any;
export type ActivityEvent = any;
export type Notification = any;
export type DownloadClient = any;
export type Blocklist = any;

export type PrismaJsonObject = Record<string, unknown>;
export type PrismaJsonArray = unknown[];
export type PrismaJsonValue = string | number | boolean | null | PrismaJsonObject | PrismaJsonArray;

export namespace Prisma {
  export type JsonValue = PrismaJsonValue;
  export type InputJsonValue = PrismaJsonValue;
  export type ActivityEventWhereInput = any;
  export type BlocklistCreateInput = any;
  export type BlocklistOrderByWithRelationInput = any;
  export type BlocklistWhereInput = any;
  export type CollectionCreateInput = any;
  export type CollectionUpdateInput = any;
  export type CustomFormatUpdateInput = any;
  export type DateTimeFilter = any;
  export type ImportListExclusionWhereInput = any;
  export type ImportListUpdateInput = any;
  export type QualityProfileUpdateInput = any;
  export type TransactionClient = any;
}
