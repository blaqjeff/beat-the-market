import { z } from "zod";

import { createWalletChallenge } from "@/lib/auth/wallet";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  publicKey: z.string().min(32),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Wallet public key is required");
    }

    const challenge = await createWalletChallenge(parsed.data.publicKey);
    return jsonOk(challenge);
  } catch (error) {
    return jsonError(error);
  }
}
