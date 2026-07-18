-- CreateEnum
CREATE TYPE "FeedStream" AS ENUM ('odds', 'scores');

-- CreateEnum
CREATE TYPE "FeedCursorStatus" AS ENUM ('starting', 'connected', 'reconnecting', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "MarketAvailability" AS ENUM ('open', 'suspended', 'closed', 'stale', 'unknown');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "sourceParticipantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "sourceFixtureId" TEXT NOT NULL,
    "competitionId" TEXT,
    "competitionName" TEXT,
    "fixtureGroupId" TEXT,
    "homeParticipantId" TEXT NOT NULL,
    "awayParticipantId" TEXT NOT NULL,
    "participant1IsHome" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "gameState" TEXT,
    "lastSourceTimestamp" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "superOddsType" TEXT NOT NULL,
    "marketParameters" TEXT,
    "marketPeriod" TEXT,
    "inRunning" BOOLEAN NOT NULL DEFAULT false,
    "availability" "MarketAvailability" NOT NULL DEFAULT 'unknown',
    "lastSourceTimestamp" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "bookmaker" TEXT,
    "bookmakerId" INTEGER,
    "priceNames" JSONB NOT NULL,
    "prices" JSONB NOT NULL,
    "pct" JSONB,
    "sourceTimestamp" BIGINT NOT NULL,
    "inRunning" BOOLEAN NOT NULL DEFAULT false,
    "gameState" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "gameState" TEXT,
    "sourceTimestamp" BIGINT,
    "stats" JSONB,
    "data" JSONB,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedCursor" (
    "id" TEXT NOT NULL,
    "stream" "FeedStream" NOT NULL,
    "status" "FeedCursorStatus" NOT NULL DEFAULT 'starting',
    "lastEventId" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "lastError" TEXT,
    "reconnectCount" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'live',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_sourceParticipantId_key" ON "Participant"("sourceParticipantId");

-- CreateIndex
CREATE INDEX "Participant_name_idx" ON "Participant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_sourceFixtureId_key" ON "Fixture"("sourceFixtureId");

-- CreateIndex
CREATE INDEX "Fixture_competitionId_idx" ON "Fixture"("competitionId");

-- CreateIndex
CREATE INDEX "Fixture_startsAt_idx" ON "Fixture"("startsAt");

-- CreateIndex
CREATE INDEX "Fixture_gameState_idx" ON "Fixture"("gameState");

-- CreateIndex
CREATE UNIQUE INDEX "Market_marketKey_key" ON "Market"("marketKey");

-- CreateIndex
CREATE INDEX "Market_fixtureId_idx" ON "Market"("fixtureId");

-- CreateIndex
CREATE INDEX "Market_superOddsType_idx" ON "Market"("superOddsType");

-- CreateIndex
CREATE INDEX "Market_availability_idx" ON "Market"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "OddsSnapshot_messageId_key" ON "OddsSnapshot"("messageId");

-- CreateIndex
CREATE INDEX "OddsSnapshot_fixtureId_sourceTimestamp_idx" ON "OddsSnapshot"("fixtureId", "sourceTimestamp");

-- CreateIndex
CREATE INDEX "OddsSnapshot_marketId_sourceTimestamp_idx" ON "OddsSnapshot"("marketId", "sourceTimestamp");

-- CreateIndex
CREATE INDEX "MatchEvent_fixtureId_sequence_idx" ON "MatchEvent"("fixtureId", "sequence");

-- CreateIndex
CREATE INDEX "MatchEvent_action_idx" ON "MatchEvent"("action");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_fixtureId_sequence_action_key" ON "MatchEvent"("fixtureId", "sequence", "action");

-- CreateIndex
CREATE UNIQUE INDEX "FeedCursor_stream_key" ON "FeedCursor"("stream");

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeParticipantId_fkey" FOREIGN KEY ("homeParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayParticipantId_fkey" FOREIGN KEY ("awayParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
