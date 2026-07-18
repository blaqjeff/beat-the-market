import { getCurrentUser } from "@/lib/auth/session";
import { getMatchState } from "@/lib/game/match-state";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await context.params;
    const user = await getCurrentUser();
    const state = await getMatchState(fixtureId, user?.id);
    return jsonOk(state);
  } catch (error) {
    return jsonError(error);
  }
}
