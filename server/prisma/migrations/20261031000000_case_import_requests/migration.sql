CREATE TABLE "CaseImportRequest" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL,
 "scope" TEXT NOT NULL,
 "payloadHash" TEXT NOT NULL,
 "count" INTEGER NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CaseImportRequest_userId_requestId_key" ON "CaseImportRequest"("userId", "requestId");
