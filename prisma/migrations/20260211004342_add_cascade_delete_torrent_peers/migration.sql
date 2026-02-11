-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TorrentPeer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "torrentId" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "client" TEXT,
    CONSTRAINT "TorrentPeer_torrentId_fkey" FOREIGN KEY ("torrentId") REFERENCES "Torrent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TorrentPeer" ("client", "id", "ip", "port", "torrentId") SELECT "client", "id", "ip", "port", "torrentId" FROM "TorrentPeer";
DROP TABLE "TorrentPeer";
ALTER TABLE "new_TorrentPeer" RENAME TO "TorrentPeer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
