CREATE TABLE `ActivityEvent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eventType` text NOT NULL,
	`sourceModule` text NOT NULL,
	`entityRef` text,
	`summary` text NOT NULL,
	`success` integer NOT NULL,
	`details` text,
	`occurredAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ActivityEvent_eventType_occurredAt_idx` ON `ActivityEvent` (`eventType`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `ActivityEvent_sourceModule_occurredAt_idx` ON `ActivityEvent` (`sourceModule`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `ActivityEvent_entityRef_idx` ON `ActivityEvent` (`entityRef`);--> statement-breakpoint
CREATE INDEX `ActivityEvent_success_occurredAt_idx` ON `ActivityEvent` (`success`,`occurredAt`);--> statement-breakpoint
CREATE TABLE `AppSettings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`torrentLimits` text NOT NULL,
	`schedulerIntervals` text NOT NULL,
	`pathVisibility` text NOT NULL,
	`apiKeys` text,
	`host` text,
	`security` text,
	`logging` text,
	`update` text,
	`mediaManagement` text,
	`streaming` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Blocklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer,
	`seriesTitle` text NOT NULL,
	`episodeId` integer,
	`seasonNumber` integer,
	`episodeNumber` integer,
	`releaseTitle` text NOT NULL,
	`quality` text,
	`indexer` text,
	`size` integer,
	`reason` text NOT NULL,
	`dateBlocked` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Blocklist_seriesId_idx` ON `Blocklist` (`seriesId`);--> statement-breakpoint
CREATE INDEX `Blocklist_dateBlocked_idx` ON `Blocklist` (`dateBlocked`);--> statement-breakpoint
CREATE TABLE `Category` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer
);
--> statement-breakpoint
CREATE TABLE `Collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdbCollectionId` integer NOT NULL,
	`name` text NOT NULL,
	`overview` text,
	`posterPath` text,
	`backdropPath` text,
	`monitored` integer DEFAULT false NOT NULL,
	`qualityProfileId` integer,
	`rootFolderPath` text,
	`addMoviesAutomatically` integer DEFAULT false NOT NULL,
	`searchOnAdd` integer DEFAULT false NOT NULL,
	`minimumAvailability` text DEFAULT 'released' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Collection_tmdbCollectionId_unique` ON `Collection` (`tmdbCollectionId`);--> statement-breakpoint
CREATE TABLE `CustomFilter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`conditions` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CustomFilter_name_type_key` ON `CustomFilter` (`name`,`type`);--> statement-breakpoint
CREATE INDEX `CustomFilter_type_idx` ON `CustomFilter` (`type`);--> statement-breakpoint
CREATE TABLE `CustomFormatScore` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customFormatId` integer NOT NULL,
	`qualityProfileId` integer NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`customFormatId`) REFERENCES `CustomFormat`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CustomFormatScore_customFormatId_qualityProfileId_key` ON `CustomFormatScore` (`customFormatId`,`qualityProfileId`);--> statement-breakpoint
CREATE TABLE `CustomFormat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`includeCustomFormatWhenRenaming` integer DEFAULT false NOT NULL,
	`conditions` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CustomFormat_name_unique` ON `CustomFormat` (`name`);--> statement-breakpoint
CREATE TABLE `DownloadClient` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`protocol` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 25 NOT NULL,
	`config` text NOT NULL,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `DownloadClient_name_unique` ON `DownloadClient` (`name`);--> statement-breakpoint
CREATE INDEX `DownloadClient_protocol_idx` ON `DownloadClient` (`protocol`);--> statement-breakpoint
CREATE INDEX `DownloadClient_enabled_idx` ON `DownloadClient` (`enabled`);--> statement-breakpoint
CREATE TABLE `Episode` (
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
	FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`seasonId`) REFERENCES `Season`(`id`) ON UPDATE no action ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Episode_tvdbId_unique` ON `Episode` (`tvdbId`);--> statement-breakpoint
CREATE TABLE `ImportListExclusion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`importListId` integer,
	`tmdbId` integer,
	`imdbId` text,
	`tvdbId` integer,
	`title` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`importListId`) REFERENCES `ImportList`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ImportListExclusion_tmdbId_imdbId_tvdbId_key` ON `ImportListExclusion` (`tmdbId`,`imdbId`,`tvdbId`);--> statement-breakpoint
CREATE INDEX `ImportListExclusion_tmdbId_idx` ON `ImportListExclusion` (`tmdbId`);--> statement-breakpoint
CREATE INDEX `ImportListExclusion_importListId_idx` ON `ImportListExclusion` (`importListId`);--> statement-breakpoint
CREATE TABLE `ImportList` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`providerType` text NOT NULL,
	`config` text NOT NULL,
	`rootFolderPath` text NOT NULL,
	`qualityProfileId` integer NOT NULL,
	`languageProfileId` integer,
	`monitorType` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`syncInterval` integer DEFAULT 24 NOT NULL,
	`lastSyncAt` integer,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ImportList_enabled_idx` ON `ImportList` (`enabled`);--> statement-breakpoint
CREATE TABLE `IndexerCategory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`minSize` integer,
	`maxSize` integer,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `IndexerHealthSnapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indexerId` integer NOT NULL,
	`lastSuccessAt` integer,
	`lastFailureAt` integer,
	`failureCount` integer DEFAULT 0 NOT NULL,
	`lastErrorMessage` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`indexerId`) REFERENCES `Indexer`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `IndexerHealthSnapshot_indexerId_unique` ON `IndexerHealthSnapshot` (`indexerId`);--> statement-breakpoint
CREATE TABLE `IndexerRelease` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guid` text NOT NULL,
	`indexerId` integer NOT NULL,
	`title` text NOT NULL,
	`size` integer,
	`downloadUrl` text,
	`infoUrl` text,
	`magnetUrl` text,
	`publishDate` integer NOT NULL,
	`seeders` integer,
	`leechers` integer,
	`protocol` text NOT NULL,
	`categories` text NOT NULL,
	`indexerFlags` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`indexerId`) REFERENCES `Indexer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `IndexerRelease_guid_unique` ON `IndexerRelease` (`guid`);--> statement-breakpoint
CREATE TABLE `Indexer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`implementation` text NOT NULL,
	`configContract` text NOT NULL,
	`settings` text NOT NULL,
	`protocol` text NOT NULL,
	`supportedMediaTypes` text DEFAULT '[]' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`supportsRss` integer DEFAULT false NOT NULL,
	`supportsSearch` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 25 NOT NULL,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Indexer_name_unique` ON `Indexer` (`name`);--> statement-breakpoint
CREATE TABLE `Media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaType` text NOT NULL,
	`tmdbId` integer,
	`tvdbId` integer,
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
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`availability` text,
	`minimumAvailability` text,
	`inCinemas` integer,
	`digitalRelease` integer,
	`physicalRelease` integer,
	`network` text,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Media_imdbId_unique` ON `Media` (`imdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Media_mediaType_tmdbId_key` ON `Media` (`mediaType`,`tmdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Media_mediaType_tvdbId_key` ON `Media` (`mediaType`,`tvdbId`);--> statement-breakpoint
CREATE TABLE `MediaFileVariant` (
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
	FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`episodeId`) REFERENCES `Episode`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MediaFileVariant_mediaType_path_key` ON `MediaFileVariant` (`mediaType`,`path`);--> statement-breakpoint
CREATE INDEX `MediaFileVariant_movieId_idx` ON `MediaFileVariant` (`movieId`);--> statement-breakpoint
CREATE INDEX `MediaFileVariant_episodeId_idx` ON `MediaFileVariant` (`episodeId`);--> statement-breakpoint
CREATE TABLE `Movie` (
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
	FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON UPDATE no action ON DELETE SET NULL,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_mediaId_unique` ON `Movie` (`mediaId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_tmdbId_unique` ON `Movie` (`tmdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Movie_imdbId_unique` ON `Movie` (`imdbId`);--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`onGrab` integer DEFAULT false NOT NULL,
	`onDownload` integer DEFAULT false NOT NULL,
	`onUpgrade` integer DEFAULT false NOT NULL,
	`onRename` integer DEFAULT false NOT NULL,
	`onSeriesAdd` integer DEFAULT false NOT NULL,
	`onEpisodeDelete` integer DEFAULT false NOT NULL,
	`config` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Notification_name_unique` ON `Notification` (`name`);--> statement-breakpoint
CREATE TABLE `PlaybackProgress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaType` text NOT NULL,
	`mediaId` integer NOT NULL,
	`userId` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`isWatched` integer DEFAULT false NOT NULL,
	`lastWatched` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PlaybackProgress_mediaType_mediaId_userId_key` ON `PlaybackProgress` (`mediaType`,`mediaId`,`userId`);--> statement-breakpoint
CREATE INDEX `PlaybackProgress_mediaType_mediaId_idx` ON `PlaybackProgress` (`mediaType`,`mediaId`);--> statement-breakpoint
CREATE INDEX `PlaybackProgress_userId_idx` ON `PlaybackProgress` (`userId`);--> statement-breakpoint
CREATE TABLE `Proxy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`hostname` text NOT NULL,
	`port` integer NOT NULL,
	`username` text,
	`password` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Proxy_name_unique` ON `Proxy` (`name`);--> statement-breakpoint
CREATE TABLE `QualityDefinition` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`resolution` integer DEFAULT 0 NOT NULL,
	`title` text,
	`weight` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `QualityProfile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cutoff` integer DEFAULT 0 NOT NULL,
	`items` text NOT NULL,
	`languageProfileId` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `QualityProfile_name_unique` ON `QualityProfile` (`name`);--> statement-breakpoint
CREATE TABLE `Season` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seriesId` integer NOT NULL,
	`seasonNumber` integer NOT NULL,
	`monitored` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Season_seriesId_seasonNumber_key` ON `Season` (`seriesId`,`seasonNumber`);--> statement-breakpoint
CREATE TABLE `Series` (
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
	FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON UPDATE no action ON DELETE SET NULL,
	FOREIGN KEY (`qualityProfileId`) REFERENCES `QualityProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Series_mediaId_unique` ON `Series` (`mediaId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_tvdbId_unique` ON `Series` (`tvdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_tmdbId_unique` ON `Series` (`tmdbId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Series_imdbId_unique` ON `Series` (`imdbId`);--> statement-breakpoint
CREATE TABLE `SubtitleHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`wantedSubtitleId` integer,
	`languageCode` text NOT NULL,
	`provider` text,
	`score` real,
	`storedPath` text,
	`message` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE CASCADE,
	FOREIGN KEY (`wantedSubtitleId`) REFERENCES `WantedSubtitle`(`id`) ON UPDATE no action ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `SubtitleHistory_variantId_idx` ON `SubtitleHistory` (`variantId`);--> statement-breakpoint
CREATE INDEX `SubtitleHistory_wantedSubtitleId_idx` ON `SubtitleHistory` (`wantedSubtitleId`);--> statement-breakpoint
CREATE TABLE `TorrentPeer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`torrentId` integer NOT NULL,
	`ip` text NOT NULL,
	`port` integer NOT NULL,
	`client` text,
	FOREIGN KEY (`torrentId`) REFERENCES `Torrent`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `Torrent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`infoHash` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`downloadSpeed` real DEFAULT 0 NOT NULL,
	`uploadSpeed` real DEFAULT 0 NOT NULL,
	`eta` integer,
	`size` integer NOT NULL,
	`downloaded` integer DEFAULT 0 NOT NULL,
	`uploaded` integer DEFAULT 0 NOT NULL,
	`ratio` real DEFAULT 0 NOT NULL,
	`path` text NOT NULL,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`completedAt` integer,
	`stopAtRatio` real,
	`stopAtTime` integer,
	`magnetUrl` text,
	`torrentFile` blob,
	`episodeId` integer,
	`movieId` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Torrent_infoHash_unique` ON `Torrent` (`infoHash`);--> statement-breakpoint
CREATE TABLE `VariantAudioTrack` (
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
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `VariantAudioTrack_variantId_streamIndex_key` ON `VariantAudioTrack` (`variantId`,`streamIndex`);--> statement-breakpoint
CREATE INDEX `VariantAudioTrack_languageCode_idx` ON `VariantAudioTrack` (`languageCode`);--> statement-breakpoint
CREATE TABLE `VariantMissingSubtitle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`languageCode` text NOT NULL,
	`isForced` integer DEFAULT false NOT NULL,
	`isHi` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `VariantMissingSubtitle_variantId_languageCode_isForced_isHi_key` ON `VariantMissingSubtitle` (`variantId`,`languageCode`,`isForced`,`isHi`);--> statement-breakpoint
CREATE INDEX `VariantMissingSubtitle_variantId_idx` ON `VariantMissingSubtitle` (`variantId`);--> statement-breakpoint
CREATE TABLE `VariantSubtitleTrack` (
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
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `VariantSubtitleTrack_variantId_idx` ON `VariantSubtitleTrack` (`variantId`);--> statement-breakpoint
CREATE INDEX `VariantSubtitleTrack_languageCode_idx` ON `VariantSubtitleTrack` (`languageCode`);--> statement-breakpoint
CREATE TABLE `WantedSubtitle` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variantId` integer NOT NULL,
	`languageCode` text NOT NULL,
	`isForced` integer DEFAULT false NOT NULL,
	`isHi` integer DEFAULT false NOT NULL,
	`state` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`variantId`) REFERENCES `MediaFileVariant`(`id`) ON UPDATE no action ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `WantedSubtitle_variantId_languageCode_isForced_isHi_key` ON `WantedSubtitle` (`variantId`,`languageCode`,`isForced`,`isHi`);--> statement-breakpoint
CREATE INDEX `WantedSubtitle_state_idx` ON `WantedSubtitle` (`state`);