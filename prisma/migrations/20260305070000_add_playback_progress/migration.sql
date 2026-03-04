-- CreateTable
CREATE TABLE "PlaybackProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mediaType" TEXT NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "progress" REAL NOT NULL DEFAULT 0,
    "isWatched" BOOLEAN NOT NULL DEFAULT false,
    "lastWatched" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackProgress_mediaType_mediaId_userId_key" ON "PlaybackProgress"("mediaType", "mediaId", "userId");

-- CreateIndex
CREATE INDEX "PlaybackProgress_mediaType_mediaId_idx" ON "PlaybackProgress"("mediaType", "mediaId");

-- CreateIndex
CREATE INDEX "PlaybackProgress_userId_idx" ON "PlaybackProgress"("userId");
