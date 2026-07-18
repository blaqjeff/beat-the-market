import { Connection, PublicKey } from "@solana/web3.js";
import { z } from "zod";

import {
  TXLINE_NETWORKS,
  type TxlineNetwork,
} from "@/lib/txline/constants";

const byteArraySchema = z.array(z.number().int().min(0).max(255));

const proofNodeSchema = z.object({
  hash: byteArraySchema,
  isRightSibling: z.boolean(),
});

export const scoreValidationPayloadSchema = z
  .object({
    ts: z.number().nonnegative(),
    statsToProve: z.array(
      z.object({
        key: z.number().int(),
        value: z.number(),
        period: z.number().int().optional(),
      })
    ),
    eventStatRoot: byteArraySchema.length(32).optional(),
    summary: z
      .object({
        fixtureId: z.union([z.number(), z.string()]).optional(),
        updateStats: z
          .object({
            minTimestamp: z.number().nonnegative().optional(),
            maxTimestamp: z.number().nonnegative().optional(),
            updateCount: z.number().int().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    statProofs: z.array(z.array(proofNodeSchema)).optional(),
    subTreeProof: z.array(proofNodeSchema).optional(),
    mainTreeProof: z.array(proofNodeSchema).optional(),
  })
  .passthrough();

export type ScoreValidationPayload = z.infer<
  typeof scoreValidationPayloadSchema
>;

export type ProofVerifyStatus =
  | "none"
  | "fetched"
  | "structure_ok"
  | "pda_found"
  | "failed";

export function epochDayFromProofTimestamp(proofTimestampMs: number): number {
  if (!Number.isSafeInteger(proofTimestampMs) || proofTimestampMs < 0) {
    throw new Error("Expected a non-negative proof timestamp in milliseconds");
  }
  const epochDay = Math.floor(proofTimestampMs / 86_400_000);
  if (epochDay > 0xffff) {
    throw new Error("Proof timestamp is outside the u16 epoch-day range");
  }
  return epochDay;
}

export function deriveDailyScoresPda(
  programId: PublicKey | string,
  epochDay: number
): PublicKey {
  const program =
    typeof programId === "string" ? new PublicKey(programId) : programId;
  const seed = Buffer.alloc(2);
  seed.writeUInt16LE(epochDay, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), seed],
    program
  )[0];
}

export function proofTimestampMs(payload: ScoreValidationPayload): number {
  const fromSummary = payload.summary?.updateStats?.minTimestamp;
  if (typeof fromSummary === "number" && Number.isFinite(fromSummary)) {
    return Math.trunc(fromSummary);
  }
  return Math.trunc(payload.ts);
}

export function inspectProofStructure(payload: unknown): {
  ok: boolean;
  detail: string;
  parsed: ScoreValidationPayload | null;
} {
  const parsed = scoreValidationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      detail: parsed.error.issues[0]?.message ?? "Invalid proof payload",
      parsed: null,
    };
  }
  if (parsed.data.statsToProve.length === 0) {
    return { ok: false, detail: "Proof has no statsToProve", parsed: null };
  }
  if (!parsed.data.statProofs?.length && !parsed.data.mainTreeProof?.length) {
    return {
      ok: false,
      detail: "Proof is missing Merkle paths",
      parsed: null,
    };
  }
  return {
    ok: true,
    detail: `Structure ok for ${parsed.data.statsToProve.length} stats`,
    parsed: parsed.data,
  };
}

export async function verifyScoreProofAgainstSolana(input: {
  payload: unknown;
  network: TxlineNetwork;
  rpcUrl?: string;
  checkPda?: boolean;
}): Promise<{
  status: ProofVerifyStatus;
  detail: string;
  proofTs: number;
  epochDay: number;
  programId: string;
  dailyScoresPda: string;
  parsed: ScoreValidationPayload | null;
}> {
  const structure = inspectProofStructure(input.payload);
  if (!structure.ok || !structure.parsed) {
    return {
      status: "failed",
      detail: structure.detail,
      proofTs: 0,
      epochDay: 0,
      programId: TXLINE_NETWORKS[input.network].programId,
      dailyScoresPda: "",
      parsed: null,
    };
  }

  const proofTs = proofTimestampMs(structure.parsed);
  const epochDay = epochDayFromProofTimestamp(proofTs);
  const programId = TXLINE_NETWORKS[input.network].programId;
  const dailyScoresPda = deriveDailyScoresPda(programId, epochDay).toBase58();

  if (!input.checkPda) {
    return {
      status: "structure_ok",
      detail: `${structure.detail}; PDA ${dailyScoresPda} (RPC check skipped)`,
      proofTs,
      epochDay,
      programId,
      dailyScoresPda,
      parsed: structure.parsed,
    };
  }

  try {
    const connection = new Connection(
      input.rpcUrl ?? TXLINE_NETWORKS[input.network].rpcUrl,
      "confirmed"
    );
    const info = await connection.getAccountInfo(
      new PublicKey(dailyScoresPda),
      "confirmed"
    );
    if (!info) {
      return {
        status: "structure_ok",
        detail: `${structure.detail}; daily scores PDA not found on ${input.network}`,
        proofTs,
        epochDay,
        programId,
        dailyScoresPda,
        parsed: structure.parsed,
      };
    }
    return {
      status: "pda_found",
      detail: `${structure.detail}; daily scores PDA exists (${info.data.length} bytes)`,
      proofTs,
      epochDay,
      programId,
      dailyScoresPda,
      parsed: structure.parsed,
    };
  } catch (error) {
    return {
      status: "structure_ok",
      detail: `${structure.detail}; Solana RPC check failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
      proofTs,
      epochDay,
      programId,
      dailyScoresPda,
      parsed: structure.parsed,
    };
  }
}
