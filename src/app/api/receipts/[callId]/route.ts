import { getReceipt } from "@/lib/game/leaderboard";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await context.params;
    const receipt = await getReceipt(callId);
    if (!receipt) {
      throw new AppError("not_found", "Receipt not found");
    }

    return jsonOk({
      id: receipt.id,
      callId: receipt.callId,
      result: receipt.result,
      pointsAwarded: receipt.pointsAwarded,
      narrative: receipt.narrative,
      finalScore: {
        home: receipt.finalHomeScore,
        away: receipt.finalAwayScore,
      },
      match: {
        sourceFixtureId: receipt.fixture.sourceFixtureId,
        home: receipt.fixture.homeParticipant.name,
        away: receipt.fixture.awayParticipant.name,
      },
      market: {
        type: receipt.marketType,
        parameters: receipt.marketParameters,
        outcomeKey: receipt.outcomeKey,
        winningOutcomeKey: receipt.winningOutcomeKey,
      },
      quote: {
        credits: receipt.credits,
        probabilityBps: receipt.probabilityBps,
        multiplierMilli: receipt.multiplierMilli,
        potentialPoints: receipt.potentialPoints,
      },
      inputs: receipt.inputsJson,
      settlementVersion: receipt.settlementVersion,
      sourceSequence: receipt.sourceSequence,
      user: receipt.user,
      proof: receipt.proof
        ? {
            id: receipt.proof.id,
            sequence: receipt.proof.sequence,
            epochDay: receipt.proof.epochDay,
            proofTs: receipt.proof.proofTs.toString(),
            network: receipt.proof.network,
            solanaProgramId: receipt.proof.solanaProgramId,
            dailyScoresPda: receipt.proof.dailyScoresPda,
            verifyStatus: receipt.proof.verifyStatus,
            verifyDetail: receipt.proof.verifyDetail,
          }
        : null,
      createdAt: receipt.createdAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
