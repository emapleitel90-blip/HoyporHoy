ALTER TABLE "Deadline" ADD COLUMN "source" TEXT;
ALTER TABLE "Deadline" ADD COLUMN "sourceDate" TEXT;
ALTER TABLE "Deadline" ADD COLUMN "sourceConfirmedAt" DATETIME;
ALTER TABLE "Deadline" ADD COLUMN "sourceConfirmedById" TEXT;

CREATE UNIQUE INDEX "Deadline_caseId_source_key" ON "Deadline"("caseId", "source");
