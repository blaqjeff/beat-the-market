import { loadEnvConfig } from "@next/env";

import { startIngestionWorker } from "../../src/lib/ingestion/worker";
import { logError } from "../../src/lib/logging/logger";

loadEnvConfig(process.cwd());

startIngestionWorker().catch((error: unknown) => {
  logError("ingestion.worker.fatal", error);
  process.exitCode = 1;
});
