import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/auth/user-profile";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    username: z.string().min(1).max(24).optional(),
    displayName: z.string().max(50).nullable().optional(),
  })
  .refine(
    (value) => value.username !== undefined || value.displayName !== undefined,
    { message: "Provide username and/or displayName" }
  );

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid profile payload");
    }

    const updated = await updateUserProfile(user.id, parsed.data);
    return jsonOk({ user: updated });
  } catch (error) {
    return jsonError(error);
  }
}
