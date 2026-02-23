-- CreateTable
CREATE TABLE "CustomFilter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSON NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFilter_name_type_key" ON "CustomFilter"("name", "type");

-- CreateIndex
CREATE INDEX "CustomFilter_type_idx" ON "CustomFilter"("type");
