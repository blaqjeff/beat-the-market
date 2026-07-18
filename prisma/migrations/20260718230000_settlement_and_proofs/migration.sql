-- CreateEnum
CREATE TYPE "SettlementResult" AS ENUM ('won', 'lost', 'void');

-- CreateEnum
CREATE TYPE "PointLedgerKind" AS ENUM ('award', 'reverse');

-- CreateEnum
CREATE TYPE "ProofVerifyStatus" AS ENUM ('none', 'fetched', 'structure_ok', 'pda_found', 'failed');

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "result" "SettlementResult",
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settlementVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "kind" "PointLedgerKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreValidationProof" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "sourceFixtureId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "statKeys" JSONB NOT NULL,
    "proofTs" BIGINT NOT NULL,
    "epochDay" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "solanaProgramId" TEXT NOT NULL,
    "dailyScoresPda" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "verifyStatus" "ProofVerifyStatus" NOT NULL DEFAULT 'fetched',
    "verifyDetail" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreValidationProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementReceipt" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "result" "SettlementResult" NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "finalHomeScore" INTEGER NOT NULL,
    "finalAwayScore" INTEGER NOT NULL,
    "winningOutcomeKey" TEXT,
    "marketType" TEXT NOT NULL,
    "marketParameters" TEXT,
    "outcomeKey" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "probabilityBps" INTEGER NOT NULL,
    "multiplierMilli" INTEGER NOT NULL,
    "potentialPoints" INTEGER NOT NULL,
    "sourceSequence" INTEGER,
    "proofId" TEXT,
    "settlementVersion" INTEGER NOT NULL DEFAULT 1,
    "inputsJson" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Call_userId_status_idx" ON "Call"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PointLedgerEntry_callId_version_kind_key" ON "PointLedgerEntry"("callId", "version", "kind");

-- CreateIndex
CREATE INDEX "PointLedgerEntry_userId_createdAt_idx" ON "PointLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointLedgerEntry_fixtureId_idx" ON "PointLedgerEntry"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreValidationProof_fixtureId_sequence_key" ON "ScoreValidationProof"("fixtureId", "sequence");

-- CreateIndex
CREATE INDEX "ScoreValidationProof_sourceFixtureId_idx" ON "ScoreValidationProof"("sourceFixtureId");

-- CreateIndex
CREATE INDEX "ScoreValidationProof_verifyStatus_idx" ON "ScoreValidationProof"("verifyStatus");

-- CreateIndex
CREATE INDEX "ScoreValidationProof_dailyScoresPda_idx" ON "ScoreValidationProof"("dailyScoresPda");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementReceipt_callId_key" ON "SettlementReceipt"("callId");

-- CreateIndex
CREATE INDEX "SettlementReceipt_userId_createdAt_idx" ON "SettlementReceipt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SettlementReceipt_fixtureId_idx" ON "SettlementReceipt"("fixtureId");

-- CreateIndex
CREATE INDEX "SettlementReceipt_proofId_idx" ON "SettlementReceipt"("proofId");

-- AddForeignKey
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreValidationProof" ADD CONSTRAINT "ScoreValidationProof_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReceipt" ADD CONSTRAINT "SettlementReceipt_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReceipt" ADD CONSTRAINT "SettlementReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReceipt" ADD CONSTRAINT "SettlementReceipt_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReceipt" ADD CONSTRAINT "SettlementReceipt_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "ScoreValidationProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;
