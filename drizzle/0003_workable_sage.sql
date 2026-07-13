ALTER TABLE `AppSettings` ADD `schedulerState` text NOT NULL DEFAULT '{}';
--> statement-breakpoint
UPDATE `AppSettings` SET `schedulerState` = '{}' WHERE `schedulerState` IS NULL;
