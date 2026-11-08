CREATE TABLE `YoutubeSubscription` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`externalId` text NOT NULL,
	`title` text,
	`enabled` integer DEFAULT true NOT NULL,
	`options` text NOT NULL,
	`lastPolledAt` integer,
	`lastError` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `YoutubeSubscription_url_unique` ON `YoutubeSubscription` (`url`);--> statement-breakpoint
CREATE INDEX `YoutubeSubscription_enabled_idx` ON `YoutubeSubscription` (`enabled`);--> statement-breakpoint
CREATE TABLE `YoutubeVideo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscriptionId` integer,
	`videoId` text NOT NULL,
	`source` text DEFAULT 'SUBSCRIPTION' NOT NULL,
	`title` text NOT NULL,
	`channel` text,
	`durationSeconds` integer,
	`publishedAt` integer,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error` text,
	`path` text,
	`thumbPath` text,
	`position` integer DEFAULT 0 NOT NULL,
	`isWatched` integer DEFAULT false NOT NULL,
	`lastPlayedAt` integer,
	`watchedAt` integer,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`lastSeenAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`subscriptionId`) REFERENCES `YoutubeSubscription`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `YoutubeVideo_videoId_unique` ON `YoutubeVideo` (`videoId`);--> statement-breakpoint
CREATE INDEX `YoutubeVideo_subscriptionId_idx` ON `YoutubeVideo` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `YoutubeVideo_status_idx` ON `YoutubeVideo` (`status`);--> statement-breakpoint
CREATE INDEX `YoutubeVideo_isWatched_idx` ON `YoutubeVideo` (`isWatched`);