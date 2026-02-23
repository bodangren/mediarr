-- CreateTable
CREATE TABLE "AppProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "enableRss" BOOLEAN NOT NULL DEFAULT true,
    "enableInteractiveSearch" BOOLEAN NOT NULL DEFAULT true,
    "enableAutomaticSearch" BOOLEAN NOT NULL DEFAULT true,
    "minimumSeeders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Application" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "syncCategories" JSONB NOT NULL DEFAULT [],
    "tags" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Indexer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "implementation" TEXT NOT NULL,
    "configContract" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "appProfileId" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "supportsRss" BOOLEAN NOT NULL DEFAULT false,
    "supportsSearch" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 25,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Indexer_appProfileId_fkey" FOREIGN KEY ("appProfileId") REFERENCES "AppProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Indexer" ("id", "name", "implementation", "configContract", "settings", "protocol", "enabled", "supportsRss", "supportsSearch", "priority", "added")
SELECT "id", "name", "implementation", "configContract", "settings", "protocol", "enabled", "supportsRss", "supportsSearch", "priority", "added" FROM "Indexer";
DROP TABLE "Indexer";
ALTER TABLE "new_Indexer" RENAME TO "Indexer";
CREATE UNIQUE INDEX "Indexer_name_key" ON "Indexer"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AppProfile_name_key" ON "AppProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Application_name_key" ON "Application"("name");

-- CreateIndex
CREATE INDEX "Indexer_appProfileId_idx" ON "Indexer"("appProfileId");
