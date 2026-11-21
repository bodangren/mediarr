ALTER TABLE `AdultItem` ADD `seriesKey` text;--> statement-breakpoint
ALTER TABLE `AdultItem` ADD `tags` text DEFAULT '[]' NOT NULL;