ALTER TABLE `WantedSubtitle` ADD `lastError` text;--> statement-breakpoint
ALTER TABLE `WantedSubtitle` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `WantedSubtitle` ADD `lastAttemptAt` integer;