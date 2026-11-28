ALTER TABLE `MusicTrack` ADD `skipCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `MusicTrack` ADD `earlySkipCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `MusicTrack` ADD `lastSkippedAt` integer;
