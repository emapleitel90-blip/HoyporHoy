CREATE TABLE "WritingTemplate" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "scope" TEXT NOT NULL,
 "requestId" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "content" TEXT NOT NULL,
 "jurisdiction" TEXT NOT NULL,
 "fuero" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "createdById" TEXT NOT NULL,
 "createdByName" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WritingTemplate_scope_requestId_key" ON "WritingTemplate"("scope", "requestId");
