import { upsertFeedCursor } from "@/lib/ingestion/cursors";
import {
  markStaleMarkets,
  persistMatchEvent,
  persistOddsRow,
} from "@/lib/ingestion/persist";
import { hasTxlineCredentials, serverEnv } from "@/lib/env/server";
import { logError, logInfo, logWarn } from "@/lib/logging/logger";
import { createServerTxlineClient } from "@/lib/txline/server-client";
import { parseSseData, type SseMessage } from "@/lib/txline/sse";
import type { FeedStream } from "@/generated/prisma/client";

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHeartbeat(message: SseMessage) {
  return message.event === "heartbeat";
}

async function handleOddsMessage(message: SseMessage) {
  if (isHeartbeat(message)) {
    await upsertFeedCursor("odds", {
      status: "connected",
      lastHeartbeatAt: new Date(),
      lastError: null,
    });
    return;
  }

  const payload = parseSseData(message);
  const rows = Array.isArray(payload) ? payload : [payload];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (!("SuperOddsType" in row || "superOddsType" in row)) continue;
    await persistOddsRow(row);
  }

  await upsertFeedCursor("odds", {
    status: "connected",
    lastEventId: message.id ?? undefined,
    lastMessageAt: new Date(),
    lastError: null,
  });
}

async function handleScoresMessage(message: SseMessage) {
  if (isHeartbeat(message)) {
    await upsertFeedCursor("scores", {
      status: "connected",
      lastHeartbeatAt: new Date(),
      lastError: null,
    });
    return;
  }

  const payload = parseSseData(message);
  const rows = Array.isArray(payload) ? payload : [payload];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (!("FixtureId" in row || "fixtureId" in row)) continue;
    await persistMatchEvent(row);
  }

  await upsertFeedCursor("scores", {
    status: "connected",
    lastEventId: message.id ?? undefined,
    lastMessageAt: new Date(),
    lastError: null,
  });
}

async function runStream(stream: FeedStream) {
  const env = serverEnv();
  let reconnectCount = 0;

  while (true) {
    try {
      if (!hasTxlineCredentials(env)) {
        throw new Error("TxLINE credentials are not configured");
      }

      await upsertFeedCursor(stream, {
        status: reconnectCount === 0 ? "starting" : "reconnecting",
        reconnectCount,
        mode: "live",
        lastError: null,
      });

      const client = createServerTxlineClient();
      logInfo("ingestion.stream.connect", { stream, reconnectCount });

      for await (const message of client.stream(stream)) {
        if (stream === "odds") {
          await handleOddsMessage(message);
        } else {
          await handleScoresMessage(message);
        }
        reconnectCount = 0;
      }

      throw new Error("TxLINE stream ended unexpectedly");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reconnectCount += 1;
      const backoff = Math.min(
        MAX_BACKOFF_MS,
        BASE_BACKOFF_MS * 2 ** Math.min(reconnectCount, 6)
      );

      await upsertFeedCursor(stream, {
        status: "reconnecting",
        reconnectCount,
        lastError: message.slice(0, 500),
      });

      logWarn("ingestion.stream.reconnect", {
        stream,
        reconnectCount,
        backoffMs: backoff,
        error: message,
      });

      await sleep(backoff);
    }
  }
}

async function staleLoop() {
  const env = serverEnv();
  while (true) {
    try {
      const count = await markStaleMarkets(env.TXLINE_MAX_SNAPSHOT_AGE_MS);
      if (count > 0) {
        logInfo("ingestion.markets.marked_stale", { count });
      }
    } catch (error) {
      logError("ingestion.stale_loop_failed", error);
    }
    await sleep(5_000);
  }
}

export async function startIngestionWorker() {
  const env = serverEnv();
  if (!hasTxlineCredentials(env)) {
    throw new Error(
      "TXLINE_GUEST_JWT and TXLINE_API_TOKEN are required for ingestion"
    );
  }

  logInfo("ingestion.worker.start", { network: env.TXLINE_NETWORK });
  await Promise.all([runStream("odds"), runStream("scores"), staleLoop()]);
}
