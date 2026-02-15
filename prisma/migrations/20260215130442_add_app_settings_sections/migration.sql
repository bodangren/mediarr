-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "host" JSONB;
ALTER TABLE "AppSettings" ADD COLUMN "logging" JSONB;
ALTER TABLE "AppSettings" ADD COLUMN "security" JSONB;
ALTER TABLE "AppSettings" ADD COLUMN "update" JSONB;
