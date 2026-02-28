-- Change ActivityEvent.eventType from enum to plain String.
-- In SQLite, Prisma enums are stored as TEXT, so no column-level DDL change
-- is needed. This migration drops the ActivityEventType enum from the schema
-- and allows arbitrary string values for eventType.
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityEvent" (
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
INSERT INTO "new_ActivityEvent" SELECT "id", "eventType", "sourceModule", "entityRef", "summary", "success", "details", "occurredAt", "createdAt" FROM "ActivityEvent";
DROP TABLE "ActivityEvent";
ALTER TABLE "new_ActivityEvent" RENAME TO "ActivityEvent";
CREATE INDEX "ActivityEvent_eventType_occurredAt_idx" ON "ActivityEvent"("eventType", "occurredAt");
CREATE INDEX "ActivityEvent_sourceModule_occurredAt_idx" ON "ActivityEvent"("sourceModule", "occurredAt");
CREATE INDEX "ActivityEvent_entityRef_idx" ON "ActivityEvent"("entityRef");
CREATE INDEX "ActivityEvent_success_occurredAt_idx" ON "ActivityEvent"("success", "occurredAt");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
