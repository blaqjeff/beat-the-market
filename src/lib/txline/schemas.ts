import { z } from "zod";

export const txlineIdentifierSchema = z.union([
  z.string().min(1),
  z.number().int().nonnegative(),
]);

export const txlineRecordSchema = z.record(z.string(), z.unknown());
export const txlineRecordListSchema = z.array(txlineRecordSchema);

export const txlineFixtureSchema = z
  .object({
    FixtureId: txlineIdentifierSchema.optional(),
    fixtureId: txlineIdentifierSchema.optional(),
    CompetitionId: txlineIdentifierSchema.optional(),
    competitionId: txlineIdentifierSchema.optional(),
    Participant1: z.string().optional(),
    participant1: z.string().optional(),
    Participant2: z.string().optional(),
    participant2: z.string().optional(),
    Participant1IsHome: z.boolean().optional(),
    participant1IsHome: z.boolean().optional(),
    StartTime: z.union([z.string(), z.number()]).optional(),
    startTime: z.union([z.string(), z.number()]).optional(),
    GameState: z.union([z.string(), z.number()]).optional(),
    gameState: z.union([z.string(), z.number()]).optional(),
  })
  .loose();

export const txlineFixtureListSchema = z.array(txlineFixtureSchema);

export const txlineScoreRecordSchema = z
  .object({
    FixtureId: txlineIdentifierSchema.optional(),
    fixtureId: txlineIdentifierSchema.optional(),
    Seq: z.number().int().nonnegative().optional(),
    seq: z.number().int().nonnegative().optional(),
    Ts: z.number().nonnegative().optional(),
    ts: z.number().nonnegative().optional(),
    StatusId: z.number().int().optional(),
    statusId: z.number().int().optional(),
    GameState: z.union([z.string(), z.number()]).optional(),
    gameState: z.union([z.string(), z.number()]).optional(),
    Action: z.string().optional(),
    action: z.string().optional(),
    Stats: txlineRecordSchema.optional(),
    stats: txlineRecordSchema.optional(),
  })
  .loose();

export const txlineScoreRecordListSchema = z.array(txlineScoreRecordSchema);

export type TxlineFixtureRecord = z.infer<typeof txlineFixtureSchema>;
export type TxlineScoreRecord = z.infer<typeof txlineScoreRecordSchema>;
export type TxlineRecord = z.infer<typeof txlineRecordSchema>;

export interface NormalizedFixture {
  fixtureId: string;
  competitionId: string | null;
  participant1: string;
  participant2: string;
  participant1IsHome: boolean;
  startsAt: string;
  gameState: string | number | null;
  source: TxlineFixtureRecord;
}

function required<T>(
  value: T | null | undefined,
  field: string
): NonNullable<T> {
  if (value === undefined || value === null || value === "") {
    throw new Error(`TxLINE fixture is missing ${field}`);
  }
  return value as NonNullable<T>;
}

function toIsoTimestamp(value: string | number): string {
  const timestamp =
    typeof value === "number" && value < 10_000_000_000
      ? value * 1_000
      : value;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error("TxLINE fixture has an invalid start time");
  }
  return date.toISOString();
}

export function normalizeFixture(input: unknown): NormalizedFixture {
  const fixture = txlineFixtureSchema.parse(input);
  const fixtureId = required(
    fixture.FixtureId ?? fixture.fixtureId,
    "FixtureId"
  );
  const participant1 = required(
    fixture.Participant1 ?? fixture.participant1,
    "Participant1"
  );
  const participant2 = required(
    fixture.Participant2 ?? fixture.participant2,
    "Participant2"
  );
  const startsAt = required(
    fixture.StartTime ?? fixture.startTime,
    "StartTime"
  );

  return {
    fixtureId: String(fixtureId),
    competitionId:
      fixture.CompetitionId !== undefined || fixture.competitionId !== undefined
        ? String(fixture.CompetitionId ?? fixture.competitionId)
        : null,
    participant1,
    participant2,
    participant1IsHome:
      fixture.Participant1IsHome ?? fixture.participant1IsHome ?? true,
    startsAt: toIsoTimestamp(startsAt),
    gameState: fixture.GameState ?? fixture.gameState ?? null,
    source: fixture,
  };
}

export function scoreIdentity(input: unknown): {
  fixtureId: string;
  sequence: number;
  sourceTimestamp: number | null;
} {
  const score = txlineScoreRecordSchema.parse(input);
  const fixtureId = required(
    score.FixtureId ?? score.fixtureId,
    "FixtureId"
  );
  const sequence = required(score.Seq ?? score.seq, "Seq");
  if (sequence < 1) {
    throw new Error("TxLINE score sequence must come from a real update");
  }

  return {
    fixtureId: String(fixtureId),
    sequence,
    sourceTimestamp: score.Ts ?? score.ts ?? null,
  };
}
