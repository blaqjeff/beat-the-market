import http from "node:http";

import { loadEnvConfig } from "@next/env";

import { startIngestionWorker } from "../../src/lib/ingestion/worker";
import { logError, logInfo, logWarn } from "../../src/lib/logging/logger";

loadEnvConfig(process.cwd());

const SELF_PING_MS = 3 * 60 * 1000;

/**
 * Free hosts (e.g. Render web services) require an HTTP listener and may
 * spin down after idle. Expose /health so keep-alive pings can hit us.
 */
function startKeepAliveServer() {
  const port = Number(process.env.PORT ?? "10000");
  const server = http.createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    if (path === "/health" || path === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "ingestion-worker" }));
      return;
    }
    res.writeHead(404).end();
  });

  server.listen(port, "0.0.0.0", () => {
    logInfo("ingestion.worker.keepalive_listen", { port });
  });
}

/**
 * While the process is awake, ping our public URL every few minutes so
 * Render's free idle timer never reaches 15m. External crons still wake
 * us if we ever sleep.
 */
function startSelfPing() {
  const publicUrl = (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.WORKER_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!publicUrl) {
    logWarn("ingestion.worker.self_ping_skipped", {
      reason: "RENDER_EXTERNAL_URL / WORKER_PUBLIC_URL unset",
    });
    return;
  }

  const healthUrl = `${publicUrl}/health`;

  const ping = () => {
    void fetch(healthUrl, { method: "GET", signal: AbortSignal.timeout(20_000) })
      .then((res) => {
        logInfo("ingestion.worker.self_ping", {
          status: res.status,
          url: healthUrl,
        });
      })
      .catch((error: unknown) => {
        logWarn("ingestion.worker.self_ping_failed", {
          url: healthUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  };

  // First ping after boot settles, then every 3 minutes.
  setTimeout(ping, 15_000);
  setInterval(ping, SELF_PING_MS);
  logInfo("ingestion.worker.self_ping_armed", { everyMs: SELF_PING_MS, healthUrl });
}

startKeepAliveServer();
startSelfPing();

startIngestionWorker().catch((error: unknown) => {
  logError("ingestion.worker.fatal", error);
  process.exitCode = 1;
});
