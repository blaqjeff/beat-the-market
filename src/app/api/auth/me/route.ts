import { getCurrentUser } from "@/lib/auth/session";
import { getUserIdentities } from "@/lib/auth/user-profile";
import { jsonError, jsonOk } from "@/lib/errors/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonOk({ user: null });
    }

    const identities = await getUserIdentities(user.id);

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        identities: {
          email: identities.email,
          wallet: identities.wallet,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
