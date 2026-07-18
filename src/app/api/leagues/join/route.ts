import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { joinLeague } from "@/lib/game/leagues";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const joinSchema = z.object({
  inviteCode: z.string().min(4).max(16),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = joinSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("validation", "Invalid invite code", parsed.error.flatten());
    }
    const league = await joinLeague({
      userId: user.id,
      inviteCode: parsed.data.inviteCode,
    });
    return jsonOk({
      league: {
        id: league.id,
        name: league.name,
        inviteCode: league.inviteCode,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
