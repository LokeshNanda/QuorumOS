/**
 * QuorumOS Crypto Utilities
 * Per docs/06-audit-and-crypto.md
 * - SHA-256 hashing for PII, OTP, tokens
 * - Vote hash chaining
 * - Merkle tree generation
 */

import { createHash, randomBytes } from "node:crypto";

const GENESIS_HASH = "0".repeat(64);

/**
 * SHA-256 hash (hex)
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Hash email for storage: SHA-256(email + election_salt)
 */
export function hashEmail(email: string, electionSalt: string): string {
  return sha256(email.toLowerCase().trim() + electionSalt);
}

/**
 * Hash OTP for storage: SHA-256(otp + session_salt)
 */
export function hashOtp(otp: string, sessionSalt: string): string {
  return sha256(otp + sessionSalt);
}

/**
 * Hash voting token for storage
 */
export function hashToken(token: string): string {
  return sha256(token);
}

/**
 * Generate vote hash per chain: SHA256(candidate_id + timestamp + previous_hash)
 */
export function computeVoteHash(
  candidateId: string,
  timestamp: Date,
  previousHash: string
): string {
  const ts = timestamp.toISOString();
  return sha256(candidateId + ts + previousHash);
}

/**
 * Genesis hash for first vote in chain
 */
export function getGenesisHash(): string {
  return GENESIS_HASH;
}

/**
 * Generate cryptographically secure random hex string
 */
export function randomHex(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Build Merkle tree from vote hashes and return root
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256("empty");
  if (hashes.length === 1) return hashes[0];

  const layer: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : left;
    layer.push(sha256(left + right));
  }
  return computeMerkleRoot(layer);
}

export interface MerkleProofStep {
  hash: string;
  position: "left" | "right";
}

/**
 * Generate Merkle proof for a leaf at the given index
 * Returns sibling hashes and positions to verify the leaf is in the tree
 */
export function computeMerkleProof(hashes: string[], leafIndex: number): MerkleProofStep[] {
  if (hashes.length === 0 || leafIndex < 0 || leafIndex >= hashes.length) {
    return [];
  }
  const proof: MerkleProofStep[] = [];
  let layer = [...hashes];
  let idx = leafIndex;

  while (layer.length > 1) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < layer.length) {
      proof.push({
        hash: layer[siblingIdx],
        position: idx % 2 === 0 ? "right" : "left",
      });
    }
    idx = Math.floor(idx / 2);
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      nextLayer.push(sha256(left + right));
    }
    layer = nextLayer;
  }
  return proof;
}

/**
 * Verify a leaf is in the Merkle tree using the proof and root
 */
export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofStep[],
  root: string
): boolean {
  let current = leaf;
  for (const step of proof) {
    current =
      step.position === "left"
        ? sha256(step.hash + current)
        : sha256(current + step.hash);
  }
  return current === root;
}
