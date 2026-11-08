CREATE TABLE `MusicIngestLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`videoId` text NOT NULL,
	`audioHash` text,
	`status` text NOT NULL,
	`trackPath` text,
	`error` text,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MusicIngestLog_videoId_unique` ON `MusicIngestLog` (`videoId`);--> statement-breakpoint
CREATE INDEX `MusicIngestLog_audioHash_idx` ON `MusicIngestLog` (`audioHash`);