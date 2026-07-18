import { destroySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/errors/http";
import { logInfo } from "@/lib/logging/logger";

export const runtime = "nodejs";

export async function POST() {
  try {
    await destroySession();
    logInfo("auth.logout");
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
