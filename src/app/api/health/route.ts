import { NextResponse } from "next/server";

import { listFeedCursors } from "@/lib/ingestion/cursors";
import { prisma } from "@/lib/db/prisma";
import { hasTxlineCredentials, serverEnv } from "@/lib/env/server";
import { logError } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = serverEnv();
  let database: "up" | "down" = "down";
  let feed: Array<{
    stream: string;
    status: string;
    mode: string;
    reconnectCount: number;
    lastHeartbeatAt: string | null;
    lastMessageAt: string | null;
    lastError: string | null;
  }> = [];

  try {
    await prisma().$queryRaw`SELECT 1`;
    database = "up";
    const cursors = await listFeedCursors();
    feed = cursors.map((cursor) => ({
      stream: cursor.stream,
      status: cursor.status,
      mode: cursor.mode,
      reconnectCount: cursor.reconnectCount,
      lastHeartbeatAt: cursor.lastHeartbeatAt?.toISOString() ?? null,
      lastMessageAt: cursor.lastMessageAt?.toISOString() ?? null,
      lastError: cursor.lastError,
    }));
  } catch (error) {
    logError("health.database_down", error);
  }

  const feedHealthy =
    feed.length > 0 &&
    feed.every(
      (cursor) =>
        cursor.status === "connected" || cursor.mode === "replay"
    );

  const body = {
    status: database === "up" ? (feedHealthy || feed.length === 0 ? "ok" : "degraded") : "degraded",
    checkedAt: new Date().toISOString(),
    services: {
      web: "up",
      database,
      feed: feed.length === 0 ? "idle" : feedHealthy ? "up" : "degraded",
      txlineCredentials: hasTxlineCredentials(env) ? "configured" : "missing",
      emailDelivery:
        env.NODE_ENV === "production"
          ? env.SENDBYTE_API_KEY
            ? "configured"
            : "missing"
          : env.SENDBYTE_API_KEY
            ? "configured"
            : "dev_console",
    },
    feed,
    network: env.TXLINE_NETWORK,
  };

  return NextResponse.json(body, {
    status: database === "up" ? 200 : 503,
  });
}
