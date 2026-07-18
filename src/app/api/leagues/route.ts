import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createLeague, listUserLeagues } from "@/lib/game/leagues";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2).max(48),
});

export async function GET() {
  try {
    const user = await requireUser();
    const leagues = await listUserLeagues(user.id);
    return jsonOk({ leagues });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("validation", "Invalid league payload", parsed.error.flatten());
    }
    const league = await createLeague({
      ownerId: user.id,
      name: parsed.data.name,
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
