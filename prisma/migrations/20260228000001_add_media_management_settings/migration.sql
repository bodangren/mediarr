-- AlterTable: Add mediaManagement JSON column to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "mediaManagement" JSONB;
