-- Create Blocklist table for tracking blocked releases
CREATE TABLE "Blocklist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER,
    "seriesTitle" TEXT NOT NULL,
    "episodeId" INTEGER,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "releaseTitle" TEXT NOT NULL,
    "quality" TEXT,
    "indexer" TEXT,
    "size" BIGINT,
    "reason" TEXT NOT NULL,
    "dateBlocked" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on seriesId for filtering by series
CREATE INDEX "Blocklist_seriesId_idx" ON "Blocklist"("seriesId");

-- Create index on dateBlocked for sorting
CREATE INDEX "Blocklist_dateBlocked_idx" ON "Blocklist"("dateBlocked");
