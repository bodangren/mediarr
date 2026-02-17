-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "languageProfileId" INTEGER;

-- CreateTable
CREATE TABLE "CustomFormat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "includeCustomFormatWhenRenaming" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomFormatScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customFormatId" INTEGER NOT NULL,
    "qualityProfileId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CustomFormatScore_customFormatId_fkey" FOREIGN KEY ("customFormatId") REFERENCES "CustomFormat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomFormatScore_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFormat_name_key" ON "CustomFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFormatScore_customFormatId_qualityProfileId_key" ON "CustomFormatScore"("customFormatId", "qualityProfileId");
