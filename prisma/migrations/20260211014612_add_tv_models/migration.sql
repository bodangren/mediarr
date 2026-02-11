-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "seasonId" INTEGER,
    "tvdbId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "airDateUtc" DATETIME,
    "overview" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("airDateUtc", "episodeNumber", "id", "monitored", "overview", "seasonNumber", "seriesId", "title", "tvdbId") SELECT "airDateUtc", "episodeNumber", "id", "monitored", "overview", "seasonNumber", "seriesId", "title", "tvdbId" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_tvdbId_key" ON "Episode"("tvdbId");
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    CONSTRAINT "Movie_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("added", "cleanTitle", "id", "imdbId", "monitored", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "year") SELECT "added", "cleanTitle", "id", "imdbId", "monitored", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");
CREATE TABLE "new_Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    CONSTRAINT "Series_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Series" ("added", "cleanTitle", "id", "imdbId", "monitored", "network", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "tvdbId", "year") SELECT "added", "cleanTitle", "id", "imdbId", "monitored", "network", "overview", "path", "qualityProfileId", "sortTitle", "status", "title", "tmdbId", "tvdbId", "year" FROM "Series";
DROP TABLE "Series";
ALTER TABLE "new_Series" RENAME TO "Series";
CREATE UNIQUE INDEX "Series_tvdbId_key" ON "Series"("tvdbId");
CREATE UNIQUE INDEX "Series_tmdbId_key" ON "Series"("tmdbId");
CREATE UNIQUE INDEX "Series_imdbId_key" ON "Series"("imdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Season_seriesId_seasonNumber_key" ON "Season"("seriesId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QualityProfile_name_key" ON "QualityProfile"("name");
