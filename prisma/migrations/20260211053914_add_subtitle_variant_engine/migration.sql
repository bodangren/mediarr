-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "path" TEXT;

-- CreateTable
CREATE TABLE "MediaFileVariant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaType" TEXT NOT NULL,
    "movieId" INTEGER,
    "episodeId" INTEGER,
    "path" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    "probeFingerprint" TEXT,
    "releaseName" TEXT,
    "quality" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaFileVariant_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaFileVariant_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariantAudioTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "variantId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "languageCode" TEXT,
    "codec" TEXT,
    "channels" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "isCommentary" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    CONSTRAINT "VariantAudioTrack_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MediaFileVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariantSubtitleTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "variantId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "streamIndex" INTEGER,
    "languageCode" TEXT,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "isHi" BOOLEAN NOT NULL DEFAULT false,
    "codec" TEXT,
    "filePath" TEXT,
    "fileSize" BIGINT,
    CONSTRAINT "VariantSubtitleTrack_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MediaFileVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WantedSubtitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "variantId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "isHi" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WantedSubtitle_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MediaFileVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtitleHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "variantId" INTEGER NOT NULL,
    "wantedSubtitleId" INTEGER,
    "languageCode" TEXT NOT NULL,
    "provider" TEXT,
    "score" REAL,
    "storedPath" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MediaFileVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubtitleHistory_wantedSubtitleId_fkey" FOREIGN KEY ("wantedSubtitleId") REFERENCES "WantedSubtitle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MediaFileVariant_movieId_idx" ON "MediaFileVariant"("movieId");

-- CreateIndex
CREATE INDEX "MediaFileVariant_episodeId_idx" ON "MediaFileVariant"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFileVariant_mediaType_path_key" ON "MediaFileVariant"("mediaType", "path");

-- CreateIndex
CREATE INDEX "VariantAudioTrack_languageCode_idx" ON "VariantAudioTrack"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "VariantAudioTrack_variantId_streamIndex_key" ON "VariantAudioTrack"("variantId", "streamIndex");

-- CreateIndex
CREATE INDEX "VariantSubtitleTrack_variantId_idx" ON "VariantSubtitleTrack"("variantId");

-- CreateIndex
CREATE INDEX "VariantSubtitleTrack_languageCode_idx" ON "VariantSubtitleTrack"("languageCode");

-- CreateIndex
CREATE INDEX "WantedSubtitle_state_idx" ON "WantedSubtitle"("state");

-- CreateIndex
CREATE UNIQUE INDEX "WantedSubtitle_variantId_languageCode_isForced_isHi_key" ON "WantedSubtitle"("variantId", "languageCode", "isForced", "isHi");

-- CreateIndex
CREATE INDEX "SubtitleHistory_variantId_idx" ON "SubtitleHistory"("variantId");

-- CreateIndex
CREATE INDEX "SubtitleHistory_wantedSubtitleId_idx" ON "SubtitleHistory"("wantedSubtitleId");
