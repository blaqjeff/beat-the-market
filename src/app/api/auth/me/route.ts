import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonOk({ user: null });
    }

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
