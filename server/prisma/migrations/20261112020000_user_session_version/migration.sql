ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "User" SET "sessionVersion" = 1
WHERE "studioId" IN (SELECT "id" FROM "Studio" WHERE "status" = 'SUSPENDED');
