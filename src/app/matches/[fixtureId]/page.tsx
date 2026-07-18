import { MatchCentre } from "@/components/game/MatchCentre";
import { getCurrentUser } from "@/lib/auth/session";
import { getMatchState } from "@/lib/game/match-state";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  const state = await getMatchState(fixtureId, user?.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <MatchCentre initialState={state} />
    </main>
  );
}
