CREATE TABLE `QuarantineEntry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`libraryKind` text DEFAULT 'ADULT' NOT NULL,
	`itemId` integer,
	`originalPath` text NOT NULL,
	`quarantinePath` text NOT NULL,
	`status` text DEFAULT 'QUARANTINED' NOT NULL,
	`movedAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`restoredAt` integer,
	`deletedAt` integer,
	`reason` text
);
--> statement-breakpoint
CREATE INDEX `QuarantineEntry_status_idx` ON `QuarantineEntry` (`status`);--> statement-breakpoint
CREATE INDEX `QuarantineEntry_originalPath_idx` ON `QuarantineEntry` (`originalPath`);