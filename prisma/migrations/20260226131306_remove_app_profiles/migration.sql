/*
  Warnings:

  - You are about to drop the `AppProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Application` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `conditions` on the `CustomFilter` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to drop the column `appProfileId` on the `Indexer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AppProfile_name_key";

-- DropIndex
DROP INDEX "Application_name_key";

-- DropIndex
DROP INDEX "Collection_qualityProfileId_idx";

-- DropIndex
DROP INDEX "Movie_collectionId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AppProfile";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Application";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ImportList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "rootFolderPath" TEXT NOT NULL,
    "qualityProfileId" INTEGER NOT NULL,
    "languageProfileId" INTEGER,
    "monitorType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 24,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportList_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportListExclusion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "importListId" INTEGER,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "tvdbId" INTEGER,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportListExclusion_importListId_fkey" FOREIGN KEY ("importListId") REFERENCES "ImportList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomFilter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CustomFilter" ("conditions", "createdAt", "id", "name", "type", "updatedAt") SELECT "conditions", "createdAt", "id", "name", "type", "updatedAt" FROM "CustomFilter";
DROP TABLE "CustomFilter";
ALTER TABLE "new_CustomFilter" RENAME TO "CustomFilter";
CREATE INDEX "CustomFilter_type_idx" ON "CustomFilter"("type");
CREATE UNIQUE INDEX "CustomFilter_name_type_key" ON "CustomFilter"("name", "type");
CREATE TABLE "new_Indexer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "implementation" TEXT NOT NULL,
    "configContract" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "supportedMediaTypes" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "supportsRss" BOOLEAN NOT NULL DEFAULT false,
    "supportsSearch" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 25,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Indexer" ("added", "configContract", "enabled", "id", "implementation", "name", "priority", "protocol", "settings", "supportsRss", "supportsSearch") SELECT "added", "configContract", "enabled", "id", "implementation", "name", "priority", "protocol", "settings", "supportsRss", "supportsSearch" FROM "Indexer";
DROP TABLE "Indexer";
ALTER TABLE "new_Indexer" RENAME TO "Indexer";
CREATE UNIQUE INDEX "Indexer_name_key" ON "Indexer"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImportList_enabled_idx" ON "ImportList"("enabled");

-- CreateIndex
CREATE INDEX "ImportListExclusion_tmdbId_idx" ON "ImportListExclusion"("tmdbId");

-- CreateIndex
CREATE INDEX "ImportListExclusion_importListId_idx" ON "ImportListExclusion"("importListId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportListExclusion_tmdbId_imdbId_tvdbId_key" ON "ImportListExclusion"("tmdbId", "imdbId", "tvdbId");
