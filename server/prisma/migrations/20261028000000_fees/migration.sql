-- Additive: existing cases, tasks, files, expenses and follow-ups are preserved.
BEGIN TRANSACTION;
CREATE TABLE "FeeAgreement" (
 "id" TEXT NOT NULL PRIMARY KEY, "caseId" TEXT NOT NULL, "description" TEXT NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'ARS', "createdById" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FeeAgreement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FeeInstallment" (
 "id" TEXT NOT NULL PRIMARY KEY, "agreementId" TEXT NOT NULL, "position" INTEGER NOT NULL,
 "amountCents" INTEGER NOT NULL, "paidCents" INTEGER NOT NULL DEFAULT 0, "dueDate" DATETIME NOT NULL,
 CONSTRAINT "FeeInstallment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "FeeAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FeePayment" (
 "id" TEXT NOT NULL PRIMARY KEY, "installmentId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL, "paidAt" DATETIME NOT NULL, "notes" TEXT,
 "registeredById" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FeePayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeeAgreement_caseId_key" ON "FeeAgreement"("caseId");
CREATE INDEX "FeeInstallment_dueDate_idx" ON "FeeInstallment"("dueDate");
CREATE UNIQUE INDEX "FeeInstallment_agreementId_position_key" ON "FeeInstallment"("agreementId", "position");
CREATE UNIQUE INDEX "FeePayment_installmentId_requestId_key" ON "FeePayment"("installmentId", "requestId");
COMMIT;
