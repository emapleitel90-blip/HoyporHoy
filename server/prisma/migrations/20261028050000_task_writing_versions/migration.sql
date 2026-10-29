ALTER TABLE "Task" ADD COLUMN "requiresWriting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TaskEvent" ADD COLUMN "writingVersionId" TEXT REFERENCES "WritingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD COLUMN "requestId" TEXT;
ALTER TABLE "TaskEvent" ADD COLUMN "reviewedSubmissionId" TEXT REFERENCES "TaskEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "TaskEvent_reviewedSubmissionId_key" ON "TaskEvent"("reviewedSubmissionId");
CREATE UNIQUE INDEX "TaskEvent_taskId_requestId_key" ON "TaskEvent"("taskId", "requestId");
