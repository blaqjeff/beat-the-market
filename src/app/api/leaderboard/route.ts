import { getLeaderboard } from "@/lib/game/leaderboard";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const board = await getLeaderboard(50);
    return jsonOk(board);
  } catch (error) {
    return jsonError(error);
  }
}
