CREATE TABLE `AdultItem` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`libraryId` integer NOT NULL,
	`path` text NOT NULL,
	`fileName` text NOT NULL,
	`title` text,
	`studio` text,
	`quality` text,
	`releaseDate` text,
	`needsReview` integer DEFAULT false NOT NULL,
	`sizeBytes` integer DEFAULT 0 NOT NULL,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`lastSeenAt` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`libraryId`) REFERENCES `Library`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AdultItem_path_unique` ON `AdultItem` (`path`);--> statement-breakpoint
CREATE INDEX `AdultItem_libraryId_idx` ON `AdultItem` (`libraryId`);--> statement-breakpoint
CREATE INDEX `AdultItem_needsReview_idx` ON `AdultItem` (`needsReview`);