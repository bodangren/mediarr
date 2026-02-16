-- CreateTable
CREATE TABLE "QualityDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resolution" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "onGrab" BOOLEAN NOT NULL DEFAULT false,
    "onDownload" BOOLEAN NOT NULL DEFAULT false,
    "onUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "onRename" BOOLEAN NOT NULL DEFAULT false,
    "onSeriesAdd" BOOLEAN NOT NULL DEFAULT false,
    "onEpisodeDelete" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DownloadClient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 25,
    "config" TEXT NOT NULL,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QualityProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cutoff" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT [],
    "languageProfileId" INTEGER
);
INSERT INTO "new_QualityProfile" ("id", "name") SELECT "id", "name" FROM "QualityProfile";
DROP TABLE "QualityProfile";
ALTER TABLE "new_QualityProfile" RENAME TO "QualityProfile";
CREATE UNIQUE INDEX "QualityProfile_name_key" ON "QualityProfile"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_name_key" ON "Notification"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadClient_name_key" ON "DownloadClient"("name");

-- CreateIndex
CREATE INDEX "DownloadClient_protocol_idx" ON "DownloadClient"("protocol");

-- CreateIndex
CREATE INDEX "DownloadClient_enabled_idx" ON "DownloadClient"("enabled");
