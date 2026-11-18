ALTER TABLE "FormConfig" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Keep the legacy global row and migrate any older per-studio overrides.
UPDATE "FormConfig"
SET "scope" = 'studio:' || "scope"
WHERE "scope" <> 'global'
  AND "scope" IN (SELECT "id" FROM "Studio")
  AND NOT EXISTS (
    SELECT 1 FROM "FormConfig" AS scoped
    WHERE scoped."scope" = 'studio:' || "FormConfig"."scope"
  );
