ALTER TABLE `AppSettings` ADD `schedulerEnabled` text;
ALTER TABLE `AppSettings` ADD `schedulerState` text NOT NULL DEFAULT '{}';