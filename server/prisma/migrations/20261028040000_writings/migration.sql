-- Immutable manual writing snapshots scoped to their original case.
BEGIN TRANSACTION;
CREATE TABLE "Writing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Writing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "WritingVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "writingId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WritingVersion_writingId_fkey" FOREIGN KEY ("writingId") REFERENCES "Writing"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Writing_caseId_requestId_key" ON "Writing"("caseId", "requestId");
CREATE UNIQUE INDEX "WritingVersion_writingId_number_key" ON "WritingVersion"("writingId", "number");
CREATE UNIQUE INDEX "WritingVersion_writingId_requestId_key" ON "WritingVersion"("writingId", "requestId");
COMMIT;
