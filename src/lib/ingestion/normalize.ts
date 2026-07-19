import { createHash } from "node:crypto";

import {
  normalizeFixture,
  txlineRecordSchema,
  txlineScoreRecordSchema,
} from "@/lib/txline/schemas";

export type MarketAvailability =
  | "open"
  | "suspended"
  | "closed"
  | "stale"
  | "unknown";

export interface NormalizedOddsRow {
  messageId: string;
  sourceFixtureId: string;
  marketKey: string;
  superOddsType: string;
  marketParameters: string | null;
  marketPeriod: string | null;
  inRunning: boolean;
  bookmaker: string | null;
  bookmakerId: number | null;
  priceNames: string[];
  prices: number[];
  pct: Array<string | number> | null;
  sourceTimestamp: bigint;
  gameState: string | null;
  availability: MarketAvailability;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedMatchEvent {
  sourceFixtureId: string;
  sequence: number;
  action: string;
  gameState: string | null;
  sourceTimestamp: bigint | null;
  stats: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  rawPayload: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bigintTimestamp(value: unknown): bigint {
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    return BigInt(value);
  }
  throw new Error("Odds row is missing Ts");
}

export function marketKey(parts: {
  sourceFixtureId: string;
  superOddsType: string;
  marketParameters: string | null;
  marketPeriod: string | null;
  inRunning: boolean;
}): string {
  return [
    parts.sourceFixtureId,
    parts.superOddsType,
    parts.marketParameters ?? "",
    parts.marketPeriod ?? "",
    parts.inRunning ? "1" : "0",
  ].join("|");
}

export function inferMarketAvailability(input: {
  inRunning: boolean;
  gameState: string | null;
  sourceTimestamp: bigint;
  maxAgeMs: number;
  nowMs?: number;
}): MarketAvailability {
  const gameState = (input.gameState ?? "").toLowerCase();
  if (
    gameState.includes("suspend") ||
    gameState.includes("interrupt") ||
    gameState.includes("abandon")
  ) {
    return "suspended";
  }
  if (
    gameState.includes("final") ||
    gameState.includes("finished") ||
    gameState.includes("cancel")
  ) {
    return "closed";
  }

  const age = (input.nowMs ?? Date.now()) - Number(input.sourceTimestamp);
  if (Number.isFinite(age) && age > input.maxAgeMs) {
    return "stale";
  }

  return "open";
}

export function normalizeOddsRow(
  input: unknown,
  options: { maxAgeMs: number; nowMs?: number }
): NormalizedOddsRow {
  const row = txlineRecordSchema.parse(input);
  const sourceFixtureId = stringOrNull(row.FixtureId ?? row.fixtureId);
  const superOddsType = stringOrNull(row.SuperOddsType ?? row.superOddsType);
  if (!sourceFixtureId || !superOddsType) {
    throw new Error("Odds row requires FixtureId and SuperOddsType");
  }

  const marketParameters = stringOrNull(
    row.MarketParameters ?? row.marketParameters
  );
  const marketPeriod = stringOrNull(row.MarketPeriod ?? row.marketPeriod);
  const inRunning = Boolean(row.InRunning ?? row.inRunning ?? false);
  const gameState = stringOrNull(row.GameState ?? row.gameState);
  const sourceTimestamp = bigintTimestamp(row.Ts ?? row.ts);
  const priceNames = Array.isArray(row.PriceNames ?? row.priceNames)
    ? ((row.PriceNames ?? row.priceNames) as unknown[]).map(String)
    : [];
  const prices = Array.isArray(row.Prices ?? row.prices)
    ? ((row.Prices ?? row.prices) as unknown[])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : [];

  const bookmaker = stringOrNull(row.Bookmaker ?? row.bookmaker);
  const bookmakerId = numberOrNull(row.BookmakerId ?? row.bookmakerId);

  const messageId =
    stringOrNull(row.MessageId ?? row.messageId) ??
    createHash("sha256")
      .update(
        JSON.stringify({
          sourceFixtureId,
          superOddsType,
          marketParameters,
          marketPeriod,
          inRunning,
          bookmaker,
          bookmakerId,
          sourceTimestamp: sourceTimestamp.toString(),
          prices,
        })
      )
      .digest("hex");

  return {
    messageId,
    sourceFixtureId,
    marketKey: marketKey({
      sourceFixtureId,
      superOddsType,
      marketParameters,
      marketPeriod,
      inRunning,
    }),
    superOddsType,
    marketParameters,
    marketPeriod,
    inRunning,
    bookmaker,
    bookmakerId,
    priceNames,
    prices,
    pct: Array.isArray(row.Pct ?? row.pct)
      ? ((row.Pct ?? row.pct) as Array<string | number>)
      : null,
    sourceTimestamp,
    gameState,
    availability: inferMarketAvailability({
      inRunning,
      gameState,
      sourceTimestamp,
      maxAgeMs: options.maxAgeMs,
      nowMs: options.nowMs,
    }),
    rawPayload: row,
  };
}

export function normalizeMatchEvent(input: unknown): NormalizedMatchEvent {
  const row = txlineScoreRecordSchema.parse(input);
  const sourceFixtureId = stringOrNull(row.FixtureId ?? row.fixtureId);
  const sequence = numberOrNull(row.Seq ?? row.seq);
  const action = stringOrNull(row.Action ?? row.action) ?? "unknown";
  if (!sourceFixtureId || sequence === null) {
    throw new Error("Score event requires FixtureId and Seq");
  }

  return {
    sourceFixtureId,
    sequence,
    action,
    gameState: stringOrNull(row.GameState ?? row.gameState),
    sourceTimestamp:
      row.Ts !== undefined || row.ts !== undefined
        ? bigintTimestamp(row.Ts ?? row.ts)
        : null,
    stats: asRecord(row.Stats ?? row.stats),
    data: asRecord(
      (row as Record<string, unknown>).Data ??
        (row as Record<string, unknown>).data
    ),
    rawPayload: row as Record<string, unknown>,
  };
}

export { normalizeFixture };
