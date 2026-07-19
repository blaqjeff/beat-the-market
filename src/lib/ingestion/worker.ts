import { upsertFeedCursor } from "@/lib/ingestion/cursors";
import {
  markStaleMarkets,
  persistFixture,
  persistMatchEvent,
  persistOddsRow,
} from "@/lib/ingestion/persist";
import { hasTxlineCredentials, serverEnv } from "@/lib/env/server";
import { isFinalMatchEvent, settleFixture } from "@/lib/game/settle";
import { logError, logInfo, logWarn } from "@/lib/logging/logger";
import { normalizeMatchEvent } from "@/lib/ingestion/normalize";
import { createServerTxlineClient } from "@/lib/txline/server-client";
import { parseSseData, type SseMessage } from "@/lib/txline/sse";
import type { FeedStream } from "@/generated/prisma/client";

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const FIXTURE_SYNC_MS = 120_000;
const SETTLE_DEBOUNCE_MS = 8_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHeartbeat(message: SseMessage) {
  return message.event === "heartbeat";
}

const pendingSettles = new Map<string, ReturnType<typeof setTimeout>>();
const settleInFlight = new Set<string>();

function competitionIds(): string[] {
  const raw = serverEnv().TXLINE_COMPETITION_IDS?.trim();
  if (!raw) return ["72"];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function scheduleSettlement(sourceFixtureId: string) {
  const existing = pendingSettles.get(sourceFixtureId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingSettles.delete(sourceFixtureId);
    void runSettlement(sourceFixtureId);
  }, SETTLE_DEBOUNCE_MS);

  pendingSettles.set(sourceFixtureId, timer);
}

async function runSettlement(sourceFixtureId: string) {
  if (settleInFlight.has(sourceFixtureId)) {
    scheduleSettlement(sourceFixtureId);
    return;
  }

  settleInFlight.add(sourceFixtureId);
  try {
    const result = await settleFixture({
      sourceFixtureId,
      allowCorrection: false,
      checkPda: Boolean(serverEnv().SOLANA_RPC_URL),
    });
    logInfo("ingestion.auto_settle.ok", {
      sourceFixtureId,
      settled: result.settled,
      voided: result.voided,
      skipped: result.skipped,
      pointsAwarded: result.pointsAwarded,
    });
  } catch (error) {
    logWarn("ingestion.auto_settle.failed", {
      sourceFixtureId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    settleInFlight.delete(sourceFixtureId);
  }
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

    const result = await persistMatchEvent(row);
    if (!result.created) continue;

    try {
      const normalized = normalizeMatchEvent(row);
      if (isFinalMatchEvent(normalized.action, normalized.gameState)) {
        scheduleSettlement(normalized.sourceFixtureId);
      }
    } catch (error) {
      logWarn("ingestion.final_detect_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
        logInfo("ingestion.markets.stale_sweep", { count });
      }
    } catch (error) {
      logError("ingestion.stale_loop_failed", error);
    }
    await sleep(5_000);
  }
}

async function fixtureSyncLoop() {
  while (true) {
    try {
      const client = createServerTxlineClient();
      const ids = competitionIds();
      let persisted = 0;
      for (const competitionId of ids) {
        const rows = await client.fixturesSnapshot({ competitionId });
        for (const row of rows) {
          await persistFixture(row);
          persisted += 1;
        }
      }
      logInfo("ingestion.fixtures.synced", {
        competitions: ids,
        fixtures: persisted,
      });
    } catch (error) {
      logWarn("ingestion.fixtures.sync_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(FIXTURE_SYNC_MS);
  }
}

export async function startIngestionWorker() {
  const env = serverEnv();
  if (!hasTxlineCredentials(env)) {
    throw new Error(
      "TXLINE_GUEST_JWT and TXLINE_API_TOKEN are required for ingestion"
    );
  }

  if (env.NODE_ENV === "production") {
    // Never leave demo cinema mode active against a live database.
    await upsertFeedCursor("odds", {
      status: "starting",
      mode: "live",
      lastError: null,
    });
    await upsertFeedCursor("scores", {
      status: "starting",
      mode: "live",
      lastError: null,
    });
  }

  logInfo("ingestion.worker.start", {
    network: env.TXLINE_NETWORK,
    competitions: competitionIds(),
  });
  await Promise.all([
    runStream("odds"),
    runStream("scores"),
    staleLoop(),
    fixtureSyncLoop(),
  ]);
}
