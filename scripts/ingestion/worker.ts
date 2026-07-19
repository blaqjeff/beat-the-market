import http from "node:http";

import { loadEnvConfig } from "@next/env";

import { startIngestionWorker } from "../../src/lib/ingestion/worker";
import { logError, logInfo } from "../../src/lib/logging/logger";

loadEnvConfig(process.cwd());

/**
 * Free hosts (e.g. Render web services) require an HTTP listener and may
 * spin down after idle. Expose /health so an external keep-alive ping can
 * keep the TxLINE SSE process awake at $0.
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

startKeepAliveServer();

startIngestionWorker().catch((error: unknown) => {
  logError("ingestion.worker.fatal", error);
  process.exitCode = 1;
});
