import { z } from "zod";

import { requestEmailSignIn } from "@/lib/auth/email";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Enter a valid email address");
    }

    const result = await requestEmailSignIn(parsed.data.email);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
