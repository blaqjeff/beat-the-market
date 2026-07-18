import "server-only";

import type { FeedCursorStatus, FeedStream } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function upsertFeedCursor(
  stream: FeedStream,
  data: {
    status?: FeedCursorStatus;
    lastEventId?: string | null;
    lastHeartbeatAt?: Date | null;
    lastMessageAt?: Date | null;
    lastError?: string | null;
    reconnectCount?: number;
    mode?: string;
  }
) {
  return prisma().feedCursor.upsert({
    where: { stream },
    create: {
      stream,
      status: data.status ?? "starting",
      lastEventId: data.lastEventId ?? undefined,
      lastHeartbeatAt: data.lastHeartbeatAt ?? undefined,
      lastMessageAt: data.lastMessageAt ?? undefined,
      lastError: data.lastError ?? undefined,
      reconnectCount: data.reconnectCount ?? 0,
      mode: data.mode ?? "live",
    },
    update: {
      status: data.status,
      lastEventId: data.lastEventId === undefined ? undefined : data.lastEventId,
      lastHeartbeatAt:
        data.lastHeartbeatAt === undefined ? undefined : data.lastHeartbeatAt,
      lastMessageAt:
        data.lastMessageAt === undefined ? undefined : data.lastMessageAt,
      lastError: data.lastError === undefined ? undefined : data.lastError,
      reconnectCount: data.reconnectCount,
      mode: data.mode,
    },
  });
}

export async function listFeedCursors() {
  return prisma().feedCursor.findMany({
    orderBy: { stream: "asc" },
  });
}
