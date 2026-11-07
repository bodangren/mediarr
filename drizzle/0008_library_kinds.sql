CREATE TABLE `Library` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`rootFolder` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`options` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Library_kind_unique` ON `Library` (`kind`);