-- User profile fields and server-backed preferences (Sprint 8D-P0)
ALTER TABLE "users" ADD COLUMN "profile_bio" TEXT;
ALTER TABLE "users" ADD COLUMN "profile_location" TEXT;
ALTER TABLE "users" ADD COLUMN "preferences" JSONB;
