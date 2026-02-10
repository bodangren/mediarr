-- CreateTable
CREATE TABLE "Series" (
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
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "tvdbId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "airDateUtc" DATETIME,
    "overview" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movie" (
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
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Indexer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "implementation" TEXT NOT NULL,
    "configContract" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "supportsRss" BOOLEAN NOT NULL DEFAULT false,
    "supportsSearch" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 25,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Series_tvdbId_key" ON "Series"("tvdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_tmdbId_key" ON "Series"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_imdbId_key" ON "Series"("imdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_tvdbId_key" ON "Episode"("tvdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_imdbId_key" ON "Movie"("imdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Indexer_name_key" ON "Indexer"("name");
