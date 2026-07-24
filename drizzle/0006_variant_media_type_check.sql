UPDATE `MediaFileVariant`
SET `mediaType` = 'EPISODE'
WHERE `mediaType` = 'TV'
	AND `movieId` IS NULL
	AND `episodeId` IS NOT NULL
	AND EXISTS (SELECT 1 FROM `Episode` WHERE `Episode`.`id` = `MediaFileVariant`.`episodeId`);--> statement-breakpoint
CREATE TEMP TABLE `__validate_MediaFileVariant_mediaType` (
	`mediaType` text NOT NULL,
	CONSTRAINT `MediaFileVariant_mediaType_check` CHECK (`mediaType` IN ('MOVIE', 'EPISODE'))
);--> statement-breakpoint
INSERT INTO `__validate_MediaFileVariant_mediaType` (`mediaType`)
SELECT `mediaType` FROM `MediaFileVariant`;--> statement-breakpoint
DROP TABLE `__validate_MediaFileVariant_mediaType`;--> statement-breakpoint
CREATE TRIGGER `MediaFileVariant_mediaType_insert_check`
BEFORE INSERT ON `MediaFileVariant`
WHEN NEW.`mediaType` NOT IN ('MOVIE', 'EPISODE')
BEGIN SELECT RAISE(ABORT, 'MediaFileVariant_mediaType_check: mediaType must be MOVIE or EPISODE'); END;--> statement-breakpoint
CREATE TRIGGER `MediaFileVariant_mediaType_update_check`
BEFORE UPDATE OF `mediaType` ON `MediaFileVariant`
WHEN NEW.`mediaType` NOT IN ('MOVIE', 'EPISODE')
BEGIN SELECT RAISE(ABORT, 'MediaFileVariant_mediaType_check: mediaType must be MOVIE or EPISODE'); END;
