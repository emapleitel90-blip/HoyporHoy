-- Some local installations registered the task migration after creating its
-- tables manually. Reconcile missing indexes without changing rows or history.
BEGIN TRANSACTION;
CREATE INDEX IF NOT EXISTS "Task_caseId_idx" ON "Task"("caseId");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Task_reviewerId_status_idx" ON "Task"("reviewerId", "status");
CREATE INDEX IF NOT EXISTS "TaskEvent_taskId_createdAt_idx" ON "TaskEvent"("taskId", "createdAt");
COMMIT;
