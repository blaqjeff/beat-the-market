import {
  advanceCinema,
  demoCinemaAllowed,
  getCinemaStatus,
  resetCinema,
  settleCinema,
  DEMO_FIXTURE_ID,
} from "@/lib/demo/cinema";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!demoCinemaAllowed()) {
      throw new AppError("forbidden", "Demo cinema disabled");
    }
    const url = new URL(request.url);
    const fixtureId = url.searchParams.get("fixtureId") ?? DEMO_FIXTURE_ID;
    return jsonOk(await getCinemaStatus(fixtureId));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!demoCinemaAllowed()) {
      throw new AppError("forbidden", "Demo cinema disabled");
    }
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      fixtureId?: string;
    };
    const fixtureId = body.fixtureId ?? DEMO_FIXTURE_ID;
    const action = body.action ?? "advance";

    if (action === "reset") {
      return jsonOk(await resetCinema(fixtureId));
    }
    if (action === "advance") {
      return jsonOk(await advanceCinema(fixtureId));
    }
    if (action === "settle") {
      return jsonOk(await settleCinema(fixtureId));
    }
    throw new AppError("bad_request", "Unknown cinema action");
  } catch (error) {
    return jsonError(error);
  }
}
