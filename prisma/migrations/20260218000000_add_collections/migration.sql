-- CreateTable
CREATE TABLE "Collection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbCollectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "monitored" BOOLEAN NOT NULL DEFAULT false,
    "qualityProfileId" INTEGER,
    "rootFolderPath" TEXT,
    "addMoviesAutomatically" BOOLEAN NOT NULL DEFAULT false,
    "searchOnAdd" BOOLEAN NOT NULL DEFAULT false,
    "minimumAvailability" TEXT NOT NULL DEFAULT 'released',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_tmdbCollectionId_key" UNIQUE ("tmdbCollectionId")
);

-- CreateIndex
CREATE INDEX "Collection_qualityProfileId_idx" ON "Collection"("qualityProfileId");

-- Add collectionId to Movie table
ALTER TABLE "Movie" ADD COLUMN "collectionId" INTEGER;

-- CreateIndex
CREATE INDEX "Movie_collectionId_idx" ON "Movie"("collectionId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_qualityProfileId_fkey" FOREIGN KEY ("qualityProfileId") REFERENCES "QualityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
