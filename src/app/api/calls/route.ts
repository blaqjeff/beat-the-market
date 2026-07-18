import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { placeCall } from "@/lib/game/place-call";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  sourceFixtureId: z.string().min(1),
  marketId: z.string().min(1),
  outcomeKey: z.string().min(1),
  credits: z.number().int().positive().max(1000),
  idempotencyKey: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid call payload", parsed.error.flatten());
    }

    const fixture = await prisma().fixture.findUnique({
      where: { sourceFixtureId: parsed.data.sourceFixtureId },
      select: { id: true },
    });
    if (!fixture) {
      throw new AppError("not_found", "Fixture not found");
    }

    const result = await placeCall({
      userId: user.id,
      fixtureId: fixture.id,
      marketId: parsed.data.marketId,
      outcomeKey: parsed.data.outcomeKey,
      credits: parsed.data.credits,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return jsonOk({
      replayed: result.replayed,
      call: {
        id: result.call.id,
        marketId: result.call.marketId,
        outcomeKey: result.call.outcomeKey,
        credits: result.call.credits,
        probabilityBps: result.call.probabilityBps,
        multiplierMilli: result.call.multiplierMilli,
        potentialPoints: result.call.potentialPoints,
        status: result.call.status,
        sourceTimestamp: result.call.sourceTimestamp.toString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
