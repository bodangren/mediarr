ALTER TABLE `YoutubeVideo` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `YoutubeVideo` ADD `retryAt` integer;