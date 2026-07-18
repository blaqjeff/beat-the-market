-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "homeScoreAtCall" INTEGER,
ADD COLUMN     "awayScoreAtCall" INTEGER,
ADD COLUMN     "matchMinuteAtCall" INTEGER,
ADD COLUMN     "gameStateAtCall" TEXT,
ADD COLUMN     "inRunningAtCall" BOOLEAN NOT NULL DEFAULT false;
