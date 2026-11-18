CREATE TABLE "AccountAccessLink" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "sessionVersion" INTEGER NOT NULL,
    "studioId" TEXT,
    CONSTRAINT "AccountAccessLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountAccessLink_tokenHash_key" ON "AccountAccessLink"("tokenHash");
