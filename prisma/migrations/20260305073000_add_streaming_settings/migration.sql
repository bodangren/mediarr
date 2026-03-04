-- AlterTable: Add streaming JSON column to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "streaming" JSONB;
