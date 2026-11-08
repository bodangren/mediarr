CREATE TABLE `MusicAlbum` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artistId` integer NOT NULL,
	`title` text NOT NULL,
	`titleKey` text NOT NULL,
	`year` integer,
	`artworkPath` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`artistId`) REFERENCES `MusicArtist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MusicAlbum_artist_title_idx` ON `MusicAlbum` (`artistId`,`titleKey`);--> statement-breakpoint
CREATE TABLE `MusicArtist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nameKey` text NOT NULL,
	`sortName` text,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MusicArtist_nameKey_unique` ON `MusicArtist` (`nameKey`);--> statement-breakpoint
CREATE TABLE `MusicTrack` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`albumId` integer NOT NULL,
	`artistId` integer NOT NULL,
	`title` text NOT NULL,
	`path` text NOT NULL,
	`trackNumber` integer,
	`discNumber` integer,
	`durationSeconds` integer,
	`format` text,
	`bitrate` integer,
	`sizeBytes` integer,
	`source` text DEFAULT 'LOCAL' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`isPlayed` integer DEFAULT false NOT NULL,
	`playCount` integer DEFAULT 0 NOT NULL,
	`lastPlayedAt` integer,
	`added` integer DEFAULT (strftime('%s','now')) NOT NULL,
	FOREIGN KEY (`albumId`) REFERENCES `MusicAlbum`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artistId`) REFERENCES `MusicArtist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MusicTrack_path_unique` ON `MusicTrack` (`path`);--> statement-breakpoint
CREATE INDEX `MusicTrack_albumId_idx` ON `MusicTrack` (`albumId`);--> statement-breakpoint
CREATE INDEX `MusicTrack_artistId_idx` ON `MusicTrack` (`artistId`);