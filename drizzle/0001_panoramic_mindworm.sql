PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_CustomFormatScore` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customFormatId` integer NOT NULL,
	`qualityProfileId` integer NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`customFormatId`) REFERENCES `CustomFormat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_CustomFormatScore`("id", "customFormatId", "qualityProfileId", "score") SELECT "id", "customFormatId", "qualityProfileId", "score" FROM `CustomFormatScore`;--> statement-breakpoint
DROP TABLE `CustomFormatScore`;--> statement-breakpoint
ALTER TABLE `__new_CustomFormatScore` RENAME TO `CustomFormatScore`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `CustomFormatScore_customFormatId_qualityProfileId_key` ON `CustomFormatScore` (`customFormatId`,`qualityProfileId`);--> statement-breakpoint
CREATE TABLE `__new_Episode` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer NOT NULL,
	`seasonId` integer,
	`tvdbId` integer NOT NULL,
	`seasonNumber` integer NOT NULL,
	`episodeNumber` integer NOT NULL,
	`title` text NOT NULL,
	`airDateUtc` integer,
	`overview` text,
	`monitored` integer DEFAULT true NOT NULL,
	`path` text,
	FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seasonId`) REFERENCES `Season`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Episode`("id", "seriesId", "seasonId", "tvdbId", "seasonNumber", "episodeNumber", "title", "airDateUtc", "overview", "monitored", "path") SELECT "id", "seriesId", "seasonId", "tvdbId", "seasonNumber", "episodeNumber", "title", "airDateUtc", "overview", "monitored", "path" FROM `Episode`;--> statement-breakpoint
DROP TABLE `Episode`;--> statement-breakpoint
ALTER TABLE `__new_Episode` RENAME TO `Episode`;--> statement-breakpoint
CREATE UNIQUE INDEX `Episode_tvdbId_unique` ON `Episode` (`tvdbId`);--> statement-breakpoint
CREATE TABLE `__new_ImportListExclusion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`importListId` integer,
	`tmdbId` integer,
	`imdbId` text,
	`tvdbId` integer,
	`title` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`importListId`) REFERENCES `ImportList`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ImportListExclusion`("id", "importListId", "tmdbId", "imdbId", "tvdbId", "title", "createdAt") SELECT "id", "importListId", "tmdbId", "imdbId", "tvdbId", "title", "createdAt" FROM `ImportListExclusion`;--> statement-breakpoint
DROP TABLE `ImportListExclusion`;--> statement-breakpoint
ALTER TABLE `__new_ImportListExclusion` RENAME TO `ImportListExclusion`;--> statement-breakpoint
CREATE UNIQUE INDEX `ImportListExclusion_tmdbId_imdbId_tvdbId_key` ON `ImportListExclusion` (`tmdbId`,`imdbId`,`tvdbId`);--> statement-breakpoint
CREATE INDEX `ImportListExclusion_tmdbId_idx` ON `ImportListExclusion` (`tmdbId`);--> statement-breakpoint
CREATE INDEX `ImportListExclusion_importListId_idx` ON `ImportListExclusion` (`importListId`);--> statement-breakpoint
CREATE TABLE `__new_IndexerHealthSnapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indexerId` integer NOT NULL,
	`lastSuccessAt` integer,
	`lastFailureAt` integer,
	`failureCount` integer DEFAULT 0 NOT NULL,
	`lastErrorMessage` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`indexerId`) REFERENCES `Indexer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_IndexerHealthSnapshot`("id", "indexerId", "lastSuccessAt", "lastFailureAt", "failureCount", "lastErrorMessage", "createdAt", "updatedAt") SELECT "id", "indexerId", "lastSuccessAt", "lastFailureAt", "failureCount", "lastErrorMessage", "createdAt", "updatedAt" FROM `IndexerHealthSnapshot`;--> statement-breakpoint
DROP TABLE `IndexerHealthSnapshot`;--> statement-breakpoint
ALTER TABLE `__new_IndexerHealthSnapshot` RENAME TO `IndexerHealthSnapshot`;--> statement-breakpoint
CREATE UNIQUE INDEX `IndexerHealthSnapshot_indexerId_unique` ON `IndexerHealthSnapshot` (`indexerId`);--> statement-breakpoint
CREATE TABLE `__new_MediaFileVariant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaType` text NOT NULL,
	`movieId` integer,
	`episodeId` integer,
	`path` text NOT NULL,
	`fileSize` integer NOT NULL,
	`monitored` integer DEFAULT true NOT NULL,
	`probeFingerprint` text,
	`releaseName` text,
	`quality` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episodeId`) REFERENCES `Episode`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_MediaFileVariant`("id", "mediaType", "movieId", "episodeId", "path", "fileSize", "monitored", "probeFingerprint", "releaseName", "quality", "createdAt", "updatedAt") SELECT "id", "mediaType", "movieId", "episodeId", "path", "fileSize", "monitored", "probeFingerprint", "releaseName", "quality", "createdAt", "updatedAt" FROM `MediaFileVariant`;--> statement-breakpoint
DROP TABLE `MediaFileVariant`;--> statement-breakpoint
ALTER TABLE `__new_MediaFileVariant` RENAME TO `MediaFileVariant`;--> statement-breakpoint
CREATE UNIQUE INDEX `MediaFileVariant_mediaType_path_key` ON `MediaFileVariant` (`mediaType`,`path`);--> statement-breakpoint
CREATE INDEX `MediaFileVariant_movieId_idx` ON `MediaFileVariant` (`movieId`);--> statement-breakpoint
CREATE INDEX `MediaFileVariant_episodeId_idx` ON `MediaFileVariant` (`episodeId`);--> statement-breakpoint
CREATE TABLE `__new_Movie` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaId` integer,
	`tmdbId` integer NOT NULL,
	`imdbId` text,
	`title` text NOT NULL,
	`cleanTitle` text NOT NULL,
	`sortTitle` text NOT NULL,
	`status` text NOT NULL,
	`overview` text,
	`monitored` integer DEFAULT true NOT NULL,
	`qualityProfileId` integer NOT NULL,
	`languageProfileId` integer,
	`path` text,
	`year` integer NOT NULL,
	`posterUrl` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`minimumAvailability` text,
	`inCinemas` integer,
	`digitalRelease` integer,
	`physicalRelease` integer,
	`collectionId` integer,
	FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_Movie`("id", "mediaId", "tmdbId", "imdbId", "title", "cleanTitle", "sortTitle", "status", "overview", "monitored", "qualityProfileId", "languageProfileId", "path", "year", "posterUrl", "added", "minimumAvailability", "inCinemas", "digitalRelease", "physicalRelease", "collectionId") SELECT "id", "mediaId", "tmdbId", "imdbId", "title", "cleanTitle", "sortTitle", "status", "overview", "monitored", "qualityProfileId", "languageProfileId", "path", "year", "posterUrl", "added", "minimumAvailability", "inCinemas", "digitalRelease", "physicalRelease", "collectionId" FROM `Movie`;--> statement-breakpoint
DROP TABLE `Movie`;--> statement-breakpoint
ALTER TABLE `__new_Movie` RENAME TO `Movie`;--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_mediaId_unique` ON `Movie` (`mediaId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_tmdbId_unique` ON `Movie` (`tmdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_imdbId_unique` ON `Movie` (`imdbId`);--> statement-breakpoint
CREATE TABLE `__new_Season` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer NOT NULL,
	`seasonNumber` integer NOT NULL,
	`monitored` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_Season`("id", "seriesId", "seasonNumber", "monitored") SELECT "id", "seriesId", "seasonNumber", "monitored" FROM `Season`;--> statement-breakpoint
DROP TABLE `Season`;--> statement-breakpoint
ALTER TABLE `__new_Season` RENAME TO `Season`;--> statement-breakpoint
CREATE UNIQUE INDEX `Season_seriesId_seasonNumber_key` ON `Season` (`seriesId`,`seasonNumber`);--> statement-breakpoint
CREATE TABLE `__new_Series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaId` integer,
	`tvdbId` integer NOT NULL,
	`tmdbId` integer,
	`imdbId` text,
	`title` text NOT NULL,
	`cleanTitle` text NOT NULL,
	`sortTitle` text NOT NULL,
	`status` text NOT NULL,
	`overview` text,
	`monitored` integer DEFAULT true NOT NULL,
	`qualityProfileId` integer NOT NULL,
	`path` text,
	`year` integer NOT NULL,
	`network` text,
	`posterUrl` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_Series`("id", "mediaId", "tvdbId", "tmdbId", "imdbId", "title", "cleanTitle", "sortTitle", "status", "overview", "monitored", "qualityProfileId", "path", "year", "network", "posterUrl", "added") SELECT "id", "mediaId", "tvdbId", "tmdbId", "imdbId", "title", "cleanTitle", "sortTitle", "status", "overview", "monitored", "qualityProfileId", "path", "year", "network", "posterUrl", "added" FROM `Series`;--> statement-breakpoint
DROP TABLE `Series`;--> statement-breakpoint
ALTER TABLE `__new_Series` RENAME TO `Series`;--> statement-breakpoint
CREATE UNIQUE INDEX `Series_mediaId_unique` ON `Series` (`mediaId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_tvdbId_unique` ON `Series` (`tvdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_tmdbId_unique` ON `Series` (`tmdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_imdbId_unique` ON `Series` (`imdbId`);--> statement-breakpoint
CREATE TABLE `__new_SubtitleHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`wantedSubtitleId` integer,
	`languageCode` text NOT NULL,
	`provider` text,
	`score` real,
	`storedPath` text,
	`message` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wantedSubtitleId`) REFERENCES `WantedSubtitle`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_SubtitleHistory`("id", "variantId", "wantedSubtitleId", "languageCode", "provider", "score", "storedPath", "message", "createdAt") SELECT "id", "variantId", "wantedSubtitleId", "languageCode", "provider", "score", "storedPath", "message", "createdAt" FROM `SubtitleHistory`;--> statement-breakpoint
DROP TABLE `SubtitleHistory`;--> statement-breakpoint
ALTER TABLE `__new_SubtitleHistory` RENAME TO `SubtitleHistory`;--> statement-breakpoint
CREATE INDEX `SubtitleHistory_variantId_idx` ON `SubtitleHistory` (`variantId`);--> statement-breakpoint
CREATE INDEX `SubtitleHistory_wantedSubtitleId_idx` ON `SubtitleHistory` (`wantedSubtitleId`);--> statement-breakpoint
CREATE TABLE `__new_TorrentPeer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`torrentId` integer NOT NULL,
	`ip` text NOT NULL,
	`port` integer NOT NULL,
	`client` text,
	FOREIGN KEY (`torrentId`) REFERENCES `Torrent`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_TorrentPeer`("id", "torrentId", "ip", "port", "client") SELECT "id", "torrentId", "ip", "port", "client" FROM `TorrentPeer`;--> statement-breakpoint
DROP TABLE `TorrentPeer`;--> statement-breakpoint
ALTER TABLE `__new_TorrentPeer` RENAME TO `TorrentPeer`;--> statement-breakpoint
CREATE TABLE `__new_VariantAudioTrack` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`streamIndex` integer NOT NULL,
	`languageCode` text,
	`codec` text,
	`channels` text,
	`isDefault` integer DEFAULT false NOT NULL,
	`isForced` integer DEFAULT false NOT NULL,
	`isCommentary` integer DEFAULT false NOT NULL,
	`name` text,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_VariantAudioTrack`("id", "variantId", "streamIndex", "languageCode", "codec", "channels", "isDefault", "isForced", "isCommentary", "name") SELECT "id", "variantId", "streamIndex", "languageCode", "codec", "channels", "isDefault", "isForced", "isCommentary", "name" FROM `VariantAudioTrack`;--> statement-breakpoint
DROP TABLE `VariantAudioTrack`;--> statement-breakpoint
ALTER TABLE `__new_VariantAudioTrack` RENAME TO `VariantAudioTrack`;--> statement-breakpoint
CREATE UNIQUE INDEX `VariantAudioTrack_variantId_streamIndex_key` ON `VariantAudioTrack` (`variantId`,`streamIndex`);--> statement-breakpoint
CREATE INDEX `VariantAudioTrack_languageCode_idx` ON `VariantAudioTrack` (`languageCode`);--> statement-breakpoint
CREATE TABLE `__new_VariantMissingSubtitle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`languageCode` text NOT NULL,
	`isForced` integer DEFAULT false NOT NULL,
	`isHi` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_VariantMissingSubtitle`("id", "variantId", "languageCode", "isForced", "isHi", "createdAt") SELECT "id", "variantId", "languageCode", "isForced", "isHi", "createdAt" FROM `VariantMissingSubtitle`;--> statement-breakpoint
DROP TABLE `VariantMissingSubtitle`;--> statement-breakpoint
ALTER TABLE `__new_VariantMissingSubtitle` RENAME TO `VariantMissingSubtitle`;--> statement-breakpoint
CREATE UNIQUE INDEX `VariantMissingSubtitle_variantId_languageCode_isForced_isHi_key` ON `VariantMissingSubtitle` (`variantId`,`languageCode`,`isForced`,`isHi`);--> statement-breakpoint
CREATE INDEX `VariantMissingSubtitle_variantId_idx` ON `VariantMissingSubtitle` (`variantId`);--> statement-breakpoint
CREATE TABLE `__new_VariantSubtitleTrack` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`source` text NOT NULL,
	`streamIndex` integer,
	`languageCode` text,
	`isForced` integer DEFAULT false NOT NULL,
	`isHi` integer DEFAULT false NOT NULL,
	`codec` text,
	`filePath` text,
	`fileSize` integer,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_VariantSubtitleTrack`("id", "variantId", "source", "streamIndex", "languageCode", "isForced", "isHi", "codec", "filePath", "fileSize") SELECT "id", "variantId", "source", "streamIndex", "languageCode", "isForced", "isHi", "codec", "filePath", "fileSize" FROM `VariantSubtitleTrack`;--> statement-breakpoint
DROP TABLE `VariantSubtitleTrack`;--> statement-breakpoint
ALTER TABLE `__new_VariantSubtitleTrack` RENAME TO `VariantSubtitleTrack`;--> statement-breakpoint
CREATE INDEX `VariantSubtitleTrack_variantId_idx` ON `VariantSubtitleTrack` (`variantId`);--> statement-breakpoint
CREATE INDEX `VariantSubtitleTrack_languageCode_idx` ON `VariantSubtitleTrack` (`languageCode`);--> statement-breakpoint
CREATE TABLE `__new_WantedSubtitle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`languageCode` text NOT NULL,
	`isForced` integer DEFAULT false NOT NULL,
	`isHi` integer DEFAULT false NOT NULL,
	`state` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_WantedSubtitle`("id", "variantId", "languageCode", "isForced", "isHi", "state", "createdAt", "updatedAt") SELECT "id", "variantId", "languageCode", "isForced", "isHi", "state", "createdAt", "updatedAt" FROM `WantedSubtitle`;--> statement-breakpoint
DROP TABLE `WantedSubtitle`;--> statement-breakpoint
ALTER TABLE `__new_WantedSubtitle` RENAME TO `WantedSubtitle`;--> statement-breakpoint
CREATE UNIQUE INDEX `WantedSubtitle_variantId_languageCode_isForced_isHi_key` ON `WantedSubtitle` (`variantId`,`languageCode`,`isForced`,`isHi`);--> statement-breakpoint
CREATE INDEX `WantedSubtitle_state_idx` ON `WantedSubtitle` (`state`);