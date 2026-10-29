-- Additive receipt history with private files linked to their original payments.
BEGIN TRANSACTION;
CREATE TABLE "FeePaymentReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeePaymentReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeePaymentReceipt_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CaseFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeePaymentReceipt_fileId_key" ON "FeePaymentReceipt"("fileId");
CREATE UNIQUE INDEX "FeePaymentReceipt_paymentId_sequence_key" ON "FeePaymentReceipt"("paymentId", "sequence");
CREATE UNIQUE INDEX "FeePaymentReceipt_paymentId_requestId_key" ON "FeePaymentReceipt"("paymentId", "requestId");
COMMIT;
