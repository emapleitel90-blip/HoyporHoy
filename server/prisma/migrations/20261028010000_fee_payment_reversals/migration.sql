-- Additive audit record: original payments and installment totals are unchanged.
BEGIN TRANSACTION;
CREATE TABLE "FeePaymentReversal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "registeredByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeePaymentReversal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeePaymentReversal_paymentId_key" ON "FeePaymentReversal"("paymentId");
COMMIT;
