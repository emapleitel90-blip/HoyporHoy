-- Additive migration: existing cases, files and tasks are preserved.
BEGIN TRANSACTION;
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "caseId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "fileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CaseFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "FollowUpEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followUpId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "changes" TEXT,
    "fileId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpEvent_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "FollowUp_caseId_kind_idx" ON "FollowUp"("caseId", "kind");
CREATE INDEX "FollowUp_ownerId_status_dueDate_idx" ON "FollowUp"("ownerId", "status", "dueDate");
CREATE INDEX "FollowUp_fileId_idx" ON "FollowUp"("fileId");
CREATE INDEX "FollowUpEvent_followUpId_createdAt_idx" ON "FollowUpEvent"("followUpId", "createdAt");
COMMIT;
