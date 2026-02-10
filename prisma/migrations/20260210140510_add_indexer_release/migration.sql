-- CreateTable
CREATE TABLE "IndexerRelease" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guid" TEXT NOT NULL,
    "indexerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "size" BIGINT,
    "downloadUrl" TEXT,
    "infoUrl" TEXT,
    "magnetUrl" TEXT,
    "publishDate" DATETIME NOT NULL,
    "seeders" INTEGER,
    "leechers" INTEGER,
    "protocol" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "indexerFlags" TEXT,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndexerRelease_indexerId_fkey" FOREIGN KEY ("indexerId") REFERENCES "Indexer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexerRelease_guid_key" ON "IndexerRelease"("guid");
