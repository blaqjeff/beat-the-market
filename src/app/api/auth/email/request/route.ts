import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { requestEmailSignIn } from "@/lib/auth/email";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  link: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Enter a valid email address");
    }

    const current = parsed.data.link ? await getCurrentUser() : null;
    const result = await requestEmailSignIn(parsed.data.email, {
      linkToUserId: current?.id,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
