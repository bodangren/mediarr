-- CreateTable
CREATE TABLE "VariantMissingSubtitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "variantId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "isHi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariantMissingSubtitle_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MediaFileVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VariantMissingSubtitle_variantId_idx" ON "VariantMissingSubtitle"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantMissingSubtitle_variantId_languageCode_isForced_isHi_key" ON "VariantMissingSubtitle"("variantId", "languageCode", "isForced", "isHi");
