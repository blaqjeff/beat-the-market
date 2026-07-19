import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  deriveDailyScoresPda,
  epochDayFromProofTimestamp,
  inspectProofStructure,
  proofTimestampMs,
  verifyScoreProofAgainstSolana,
} from "@/lib/txline/verify-proof";
import { TXLINE_NETWORKS } from "@/lib/txline/constants";

describe("score proof verification", () => {
  it("derives epoch day and daily scores PDA from proof timestamp", () => {
    const ts = 1784149585543;
    const epochDay = epochDayFromProofTimestamp(ts);
    expect(epochDay).toBe(Math.floor(ts / 86_400_000));
    const pda = deriveDailyScoresPda(
      TXLINE_NETWORKS.mainnet.programId,
      epochDay
    );
    expect(pda.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });

  it("accepts the captured validation fixture structure", async () => {
    const absolute = path.join(
      process.cwd(),
      "tests/fixtures/txline/validation.18257865.seq1.json"
    );
    const payload = JSON.parse(await readFile(absolute, "utf8")) as unknown;
    const structure = inspectProofStructure(payload);
    expect(structure.ok).toBe(true);
    expect(structure.parsed).not.toBeNull();
    expect(proofTimestampMs(structure.parsed!)).toBe(1784149585543);

    const verified = await verifyScoreProofAgainstSolana({
      payload,
      network: "mainnet",
      checkPda: false,
    });
    // Captured demo fixtures may only pass structure; local Merkle uses
    // SHA-256(Borsh(ScoreStat)) and upgrades to paths_ok when paths converge.
    expect(["structure_ok", "paths_ok"]).toContain(verified.status);
    expect(verified.dailyScoresPda.length).toBeGreaterThan(20);
    expect(verified.programId).toBe(TXLINE_NETWORKS.mainnet.programId);
  });
});
