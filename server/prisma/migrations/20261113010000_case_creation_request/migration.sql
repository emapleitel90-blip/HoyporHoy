CREATE TABLE "CaseCreationRequest" (
    "caseId" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    CONSTRAINT "CaseCreationRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CaseCreationRequest_actorId_requestId_key" ON "CaseCreationRequest"("actorId", "requestId");
