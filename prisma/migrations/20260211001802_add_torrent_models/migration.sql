-- CreateTable
CREATE TABLE "Torrent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "infoHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "downloadSpeed" REAL NOT NULL DEFAULT 0,
    "uploadSpeed" REAL NOT NULL DEFAULT 0,
    "eta" INTEGER,
    "size" BIGINT NOT NULL,
    "downloaded" BIGINT NOT NULL DEFAULT 0,
    "uploaded" BIGINT NOT NULL DEFAULT 0,
    "ratio" REAL NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "stopAtRatio" REAL,
    "stopAtTime" INTEGER,
    "magnetUrl" TEXT,
    "torrentFile" BLOB
);

-- CreateTable
CREATE TABLE "TorrentPeer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "torrentId" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "client" TEXT,
    CONSTRAINT "TorrentPeer_torrentId_fkey" FOREIGN KEY ("torrentId") REFERENCES "Torrent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Torrent_infoHash_key" ON "Torrent"("infoHash");
