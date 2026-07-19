import { createHash } from "node:crypto";

export type MerkleProofNode = {
  hash: number[];
  isRightSibling: boolean;
};

/** Borsh-encode ScoreStat { key:u32, value:i32, period:i32 } little-endian. */
export function encodeScoreStat(stat: {
  key: number;
  value: number;
  period?: number;
}): Buffer {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(stat.key >>> 0, 0);
  buf.writeInt32LE(Math.trunc(stat.value), 4);
  buf.writeInt32LE(Math.trunc(stat.period ?? 0), 8);
  return buf;
}

export function sha256(data: Buffer | Uint8Array): Buffer {
  return createHash("sha256").update(data).digest();
}

export function hashScoreStatLeaf(stat: {
  key: number;
  value: number;
  period?: number;
}): Buffer {
  return sha256(encodeScoreStat(stat));
}

/**
 * Walk a Merkle path. Sibling order follows TxLINE ProofNode.isRightSibling:
 * when true, sibling is on the right (hash(current || sibling)).
 */
export function walkMerklePath(
  leaf: Buffer,
  nodes: MerkleProofNode[]
): Buffer {
  let current: Buffer = Buffer.from(leaf);
  for (const node of nodes) {
    if (node.hash.length !== 32) {
      throw new Error("Merkle proof node hash must be 32 bytes");
    }
    const sibling: Buffer = Buffer.from(node.hash);
    const combined = node.isRightSibling
      ? Buffer.concat([current, sibling])
      : Buffer.concat([sibling, current]);
    current = Buffer.from(sha256(combined));
  }
  return current;
}

export function buffersEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.equals(b);
}

export function isZeroHash(bytes: number[] | undefined): boolean {
  return Boolean(bytes?.length === 32 && bytes.every((b) => b === 0));
}

/**
 * Local cryptographic check: each stat leaf + its path must converge to the
 * same event root (payload.eventStatRoot when non-zero, else first computed).
 */
export function verifyStatMerklePaths(input: {
  statsToProve: Array<{ key: number; value: number; period?: number }>;
  statProofs: MerkleProofNode[][];
  eventStatRoot?: number[];
}): { ok: boolean; detail: string; eventRoot: Buffer | null } {
  if (input.statsToProve.length === 0) {
    return { ok: false, detail: "No stats to prove", eventRoot: null };
  }
  if (input.statProofs.length !== input.statsToProve.length) {
    return {
      ok: false,
      detail: "statProofs length does not match statsToProve",
      eventRoot: null,
    };
  }

  let expectedRoot: Buffer | null = null;
  if (input.eventStatRoot && !isZeroHash(input.eventStatRoot)) {
    expectedRoot = Buffer.from(input.eventStatRoot);
  }

  for (let i = 0; i < input.statsToProve.length; i += 1) {
    const leaf = hashScoreStatLeaf(input.statsToProve[i]!);
    const root = walkMerklePath(leaf, input.statProofs[i] ?? []);
    if (!expectedRoot) {
      expectedRoot = root;
      continue;
    }
    if (!buffersEqual(root, expectedRoot)) {
      return {
        ok: false,
        detail: `Stat proof ${i} does not converge to event root`,
        eventRoot: expectedRoot,
      };
    }
  }

  return {
    ok: true,
    detail: `Merkle paths ok for ${input.statsToProve.length} stats`,
    eventRoot: expectedRoot,
  };
}
