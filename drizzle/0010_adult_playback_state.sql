ALTER TABLE `AdultItem` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `AdultItem` ADD `duration` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `AdultItem` ADD `isWatched` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `AdultItem` ADD `lastPlayedAt` integer;