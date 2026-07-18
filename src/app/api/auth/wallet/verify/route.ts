import { z } from "zod";

import { verifyWalletSignIn } from "@/lib/auth/wallet";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  publicKey: z.string().min(32),
  nonce: z.string().min(8),
  signature: z.string().min(32),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Wallet verification payload is invalid");
    }

    const user = await verifyWalletSignIn(
      parsed.data.publicKey,
      parsed.data.nonce,
      parsed.data.signature
    );

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
