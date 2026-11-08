CREATE TABLE `AdultDiscoveryReceipt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`runAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`sources` text NOT NULL,
	`picks` text NOT NULL,
	`duplicates` text NOT NULL,
	`failures` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `AdultDiscoveryReceipt_runAt_idx` ON `AdultDiscoveryReceipt` (`runAt`);