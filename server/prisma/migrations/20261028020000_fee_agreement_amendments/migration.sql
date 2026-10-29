-- Additive amendment history; pre-existing agreements begin at version 1.
BEGIN TRANSACTION;
ALTER TABLE "FeeAgreement" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "FeeAgreementAmendment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agreementId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestData" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "registeredById" TEXT NOT NULL,
    "registeredByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beforeData" TEXT NOT NULL,
    "afterData" TEXT NOT NULL,
    CONSTRAINT "FeeAgreementAmendment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "FeeAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeeAgreementAmendment_agreementId_requestId_key" ON "FeeAgreementAmendment"("agreementId", "requestId");
CREATE UNIQUE INDEX "FeeAgreementAmendment_agreementId_version_key" ON "FeeAgreementAmendment"("agreementId", "version");
COMMIT;
