import { settleFixture } from "@/lib/game/settle";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";
import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const env = serverEnv();
    if (env.NODE_ENV === "production") {
      const secret = request.headers.get("x-settlement-secret");
      if (!secret || secret !== env.AUTH_SECRET) {
        throw new AppError("forbidden", "Settlement is restricted");
      }
    }

    const { fixtureId } = await context.params;
    const url = new URL(request.url);
    const allowCorrection = url.searchParams.get("correct") === "1";
    const checkPda = url.searchParams.get("pda") === "1";

    const result = await settleFixture({
      sourceFixtureId: fixtureId,
      allowCorrection,
      checkPda,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
