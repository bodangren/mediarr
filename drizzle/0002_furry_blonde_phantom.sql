CREATE TABLE `TaskExecution` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taskName` text NOT NULL,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`status` text NOT NULL,
	`durationMs` integer,
	`errorMessage` text
);
--> statement-breakpoint
CREATE INDEX `TaskExecution_taskName_startedAt_idx` ON `TaskExecution` (`taskName`,`startedAt`);