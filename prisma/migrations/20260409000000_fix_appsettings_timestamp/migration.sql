-- Fix AppSettings createdAt/updatedAt columns
-- Problem: columns are INTEGER storing Unix seconds but Prisma passes milliseconds (Date.now())
-- Solution: convert to TEXT storing ISO 8601 datetime strings with milliseconds and Z suffix
-- Prisma expects: "2026-04-08T14:01:41.000Z" format

ALTER TABLE "AppSettings" RENAME TO "AppSettings_old";

CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "torrentLimits" TEXT NOT NULL,
    "schedulerIntervals" TEXT NOT NULL,
    "pathVisibility" TEXT NOT NULL,
    "apiKeys" TEXT,
    "host" TEXT,
    "security" TEXT,
    "logging" TEXT,
    "update" TEXT,
    "mediaManagement" TEXT,
    "streaming" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S.000Z')),
    "updatedAt" TEXT NOT NULL
);

INSERT INTO "AppSettings" (
    "id", "torrentLimits", "schedulerIntervals", "pathVisibility",
    "apiKeys", "host", "security", "logging", "update",
    "mediaManagement", "streaming", "createdAt", "updatedAt"
)
SELECT
    "id", "torrentLimits", "schedulerIntervals", "pathVisibility",
    "apiKeys", "host", "security", "logging", "update",
    "mediaManagement", "streaming",
    CASE
        WHEN "createdAt" > 10000000000 THEN
            strftime('%Y-%m-%dT%H:%M:', "createdAt" / 1000) ||
            substr('0' || (("createdAt" / 1000) % 60), -2, 2) || '.000Z'
        WHEN "createdAt" > 0 THEN
            strftime('%Y-%m-%dT%H:%M:', "createdAt") ||
            substr('0' || ("createdAt" % 60), -2, 2) || '.000Z'
        ELSE strftime('%Y-%m-%dT%H:%M:%S.000Z')
    END,
    CASE
        WHEN "updatedAt" > 10000000000 THEN
            strftime('%Y-%m-%dT%H:%M:', "updatedAt" / 1000) ||
            substr('0' || (("updatedAt" / 1000) % 60), -2, 2) || '.000Z'
        WHEN "updatedAt" > 0 THEN
            strftime('%Y-%m-%dT%H:%M:', "updatedAt") ||
            substr('0' || ("updatedAt" % 60), -2, 2) || '.000Z'
        ELSE strftime('%Y-%m-%dT%H:%M:%S.000Z')
    END
FROM "AppSettings_old";

DROP TABLE "AppSettings_old";