/**
 * Reset France vs England into the interactive cinema (prematch beat).
 * Prefer: npm run demo:cinema
 */
import { loadEnvConfig } from "@next/env";

import { DEMO_FIXTURE_ID, resetCinema } from "../../src/lib/demo/cinema";

loadEnvConfig(process.cwd());

async function main() {
  const sourceFixtureId = process.argv[2] ?? DEMO_FIXTURE_ID;
  const status = await resetCinema(sourceFixtureId);
  console.log(
    JSON.stringify(
      {
        ...status,
        open: `http://localhost:3000${status.matchUrl}`,
        next: "Place a call, then use Advance match on the page (or npm run demo:cinema -- advance)",
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
