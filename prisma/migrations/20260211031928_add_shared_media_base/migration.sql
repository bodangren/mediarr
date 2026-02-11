-- CreateTable
CREATE TABLE "Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaType" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "tvdbId" INTEGER,
    "imdbId" TEXT,
    "title" TEXT NOT NULL,
    "cleanTitle" TEXT NOT NULL,
    "sortTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overview" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    "qualityProfileId" INTEGER NOT NULL,
    "path" TEXT,
    "year" INTEGER NOT NULL,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availability" TEXT,
    "minimumAvailability" TEXT,
    "inCinemas" DATETIME,
    "digitalRelease" DATETIME,
    "physicalRelease" DATETIME,
    "network" TEXT,
    CONSTRAINT "Media_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaId" INTEGER,
    "tmdbId" INTEGER NOT NULL,
    "imdbId" TEXT,
    "title" TEXT NOT NULL,
    "cleanTitle" TEXT NOT NULL,
    "sortTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overview" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    "qualityProfileId" INTEGER NOT NULL,
    "path" TEXT,
    "year" INTEGER NOT NULL,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minimumAvailability" TEXT,
    "inCinemas" DATETIME,
    "digitalRelease" DATETIME,
    "physicalRelease" DATETIME,
    CONSTRAINT "Movie_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Movie_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("added", "cleanTitle", "id", "imdbId", "monitored", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "year") SELECT "added", "cleanTitle", "id", "imdbId", "monitored", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_mediaId_key" ON "Movie"("mediaId");
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");
CREATE TABLE "new_Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaId" INTEGER,
    "tvdbId" INTEGER NOT NULL,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "title" TEXT NOT NULL,
    "cleanTitle" TEXT NOT NULL,
    "sortTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overview" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    "qualityProfileId" INTEGER NOT NULL,
    "path" TEXT,
    "year" INTEGER NOT NULL,
    "network" TEXT,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Series_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Series_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Series" ("added", "cleanTitle", "id", "imdbId", "monitored", "network", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "tvdbId", "year") SELECT "added", "cleanTitle", "id", "imdbId", "monitored", "network", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "tvdbId", "year" FROM "Series";
DROP TABLE "Series";
ALTER TABLE "new_Series" RENAME TO "Series";
CREATE UNIQUE INDEX "Series_mediaId_key" ON "Series"("mediaId");
CREATE UNIQUE INDEX "Series_tvdbId_key" ON "Series"("tvdbId");
CREATE UNIQUE INDEX "Series_tmdbId_key" ON "Series"("tmdbId");
CREATE UNIQUE INDEX "Series_imdbId_key" ON "Series"("imdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Media_tmdbId_key" ON "Media"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_tvdbId_key" ON "Media"("tvdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_imdbId_key" ON "Media"("imdbId");
