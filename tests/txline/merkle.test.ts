import { describe, expect, it } from "vitest";

import {
  hashScoreStatLeaf,
  verifyStatMerklePaths,
  walkMerklePath,
} from "@/lib/txline/merkle";

describe("txline merkle helpers", () => {
  it("hashes ScoreStat leaves deterministically", () => {
    const a = hashScoreStatLeaf({ key: 1, value: 2, period: 0 });
    const b = hashScoreStatLeaf({ key: 1, value: 2, period: 0 });
    const c = hashScoreStatLeaf({ key: 1, value: 3, period: 0 });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.length).toBe(32);
  });

  it("walks a single-sibling path to a stable root", () => {
    const leaf = hashScoreStatLeaf({ key: 1, value: 0, period: 0 });
    const sibling = Buffer.alloc(32, 7);
    const root = walkMerklePath(leaf, [
      { hash: [...sibling], isRightSibling: true },
    ]);
    expect(root.length).toBe(32);

    const again = walkMerklePath(leaf, [
      { hash: [...sibling], isRightSibling: true },
    ]);
    expect(root.equals(again)).toBe(true);
  });

  it("requires converging proofs for multiple stats", () => {
    const leafA = hashScoreStatLeaf({ key: 1, value: 0, period: 0 });
    const leafB = hashScoreStatLeaf({ key: 2, value: 0, period: 0 });
    const sibling = Buffer.alloc(32, 9);
    const rootA = walkMerklePath(leafA, [
      { hash: [...sibling], isRightSibling: true },
    ]);
    const rootB = walkMerklePath(leafB, [
      { hash: [...sibling], isRightSibling: true },
    ]);

    const ok = verifyStatMerklePaths({
      statsToProve: [
        { key: 1, value: 0, period: 0 },
        { key: 1, value: 0, period: 0 },
      ],
      statProofs: [
        [{ hash: [...sibling], isRightSibling: true }],
        [{ hash: [...sibling], isRightSibling: true }],
      ],
      eventStatRoot: [...rootA],
    });
    expect(ok.ok).toBe(true);

    const bad = verifyStatMerklePaths({
      statsToProve: [
        { key: 1, value: 0, period: 0 },
        { key: 2, value: 0, period: 0 },
      ],
      statProofs: [
        [{ hash: [...sibling], isRightSibling: true }],
        [{ hash: [...sibling], isRightSibling: true }],
      ],
      eventStatRoot: [...rootA],
    });
    expect(bad.ok).toBe(false);
    expect(rootA.equals(rootB)).toBe(false);
  });
});
