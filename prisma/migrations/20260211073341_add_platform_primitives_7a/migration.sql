-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "torrentLimits" JSONB NOT NULL,
    "schedulerIntervals" JSONB NOT NULL,
    "pathVisibility" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IndexerHealthSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "indexerId" INTEGER NOT NULL,
    "lastSuccessAt" DATETIME,
    "lastFailureAt" DATETIME,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IndexerHealthSnapshot_indexerId_fkey" FOREIGN KEY ("indexerId") REFERENCES "Indexer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "entityRef" TEXT,
    "summary" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "details" JSONB,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexerHealthSnapshot_indexerId_key" ON "IndexerHealthSnapshot"("indexerId");

-- CreateIndex
CREATE INDEX "ActivityEvent_eventType_occurredAt_idx" ON "ActivityEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_sourceModule_occurredAt_idx" ON "ActivityEvent"("sourceModule", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_entityRef_idx" ON "ActivityEvent"("entityRef");

-- CreateIndex
CREATE INDEX "ActivityEvent_success_occurredAt_idx" ON "ActivityEvent"("success", "occurredAt");
