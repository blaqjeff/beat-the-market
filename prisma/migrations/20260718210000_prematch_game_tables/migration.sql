-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('pending', 'settled', 'void');

-- CreateEnum
CREATE TYPE "CreditLedgerKind" AS ENUM ('grant', 'spend', 'refund');

-- CreateTable
CREATE TABLE "MatchCreditAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "startingCredits" INTEGER NOT NULL DEFAULT 1000,
    "remainingCredits" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchCreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "callId" TEXT,
    "kind" "CreditLedgerKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "oddsSnapshotId" TEXT NOT NULL,
    "outcomeKey" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "probabilityBps" INTEGER NOT NULL,
    "multiplierMilli" INTEGER NOT NULL,
    "potentialPoints" INTEGER NOT NULL,
    "sourceTimestamp" BIGINT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchCreditAccount_fixtureId_idx" ON "MatchCreditAccount"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCreditAccount_userId_fixtureId_key" ON "MatchCreditAccount"("userId", "fixtureId");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_accountId_createdAt_idx" ON "CreditLedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_callId_idx" ON "CreditLedgerEntry"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_idempotencyKey_key" ON "Call"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Call_userId_fixtureId_idx" ON "Call"("userId", "fixtureId");

-- CreateIndex
CREATE INDEX "Call_fixtureId_status_idx" ON "Call"("fixtureId", "status");

-- CreateIndex
CREATE INDEX "Call_marketId_idx" ON "Call"("marketId");

-- AddForeignKey
ALTER TABLE "MatchCreditAccount" ADD CONSTRAINT "MatchCreditAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCreditAccount" ADD CONSTRAINT "MatchCreditAccount_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MatchCreditAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_oddsSnapshotId_fkey" FOREIGN KEY ("oddsSnapshotId") REFERENCES "OddsSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
