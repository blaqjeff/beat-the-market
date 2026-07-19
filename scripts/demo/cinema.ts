/**
 * Past-match cinema for demo recording.
 *
 *   npm run demo:cinema              # reset to prematch
 *   npm run demo:cinema -- advance   # one beat
 *   npm run demo:cinema -- settle    # after full time
 */
import { loadEnvConfig } from "@next/env";

import {
  advanceCinema,
  DEMO_FIXTURE_ID,
  resetCinema,
  settleCinema,
} from "../../src/lib/demo/cinema";

loadEnvConfig(process.cwd());

async function main() {
  const action = (process.argv[2] ?? "reset").toLowerCase();
  const fixtureId = process.argv[3] ?? DEMO_FIXTURE_ID;

  if (action === "reset" || action === "start") {
    const status = await resetCinema(fixtureId);
    console.log(
      JSON.stringify(
        {
          ...status,
          open: `http://localhost:3000${status.matchUrl}`,
          tip: "Open the match URL, place a call, then click Advance match (or re-run with advance).",
        },
        null,
        2
      )
    );
    return;
  }

  if (action === "advance" || action === "next") {
    console.log(JSON.stringify(await advanceCinema(fixtureId), null, 2));
    return;
  }

  if (action === "settle") {
    console.log(JSON.stringify(await settleCinema(fixtureId), null, 2));
    return;
  }

  throw new Error("Usage: npm run demo:cinema -- [reset|advance|settle] [fixtureId]");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
