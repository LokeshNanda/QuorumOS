import { describe, it, expect } from "vitest";
import {
  sha256,
  hashEmail,
  hashOtp,
  hashToken,
  computeVoteHash,
  getGenesisHash,
  randomHex,
  computeMerkleRoot,
  computeMerkleProof,
  verifyMerkleProof,
} from "./crypto";

describe("sha256", () => {
  it("hashes string to 64-char hex", () => {
    const result = sha256("hello");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });
});

describe("hashEmail", () => {
  it("hashes email with salt", () => {
    const h1 = hashEmail("test@example.com", "salt1");
    const h2 = hashEmail("test@example.com", "salt2");
    expect(h1).not.toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes email to lowercase", () => {
    const h1 = hashEmail("Test@Example.COM", "salt");
    const h2 = hashEmail("test@example.com", "salt");
    expect(h1).toBe(h2);
  });
});

describe("hashOtp", () => {
  it("hashes OTP with session salt", () => {
    const h = hashOtp("123456", "session_salt");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("hashToken", () => {
  it("hashes token", () => {
    const h = hashToken("abc123");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("computeVoteHash", () => {
  it("computes vote hash with genesis", () => {
    const genesis = getGenesisHash();
    const hash = computeVoteHash("candidate-id", new Date("2025-01-01T00:00:00Z"), genesis);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different inputs", () => {
    const genesis = getGenesisHash();
    const h1 = computeVoteHash("c1", new Date("2025-01-01T00:00:00Z"), genesis);
    const h2 = computeVoteHash("c2", new Date("2025-01-01T00:00:00Z"), genesis);
    const h3 = computeVoteHash("c1", new Date("2025-01-01T00:00:01Z"), genesis);
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
  });
});

describe("getGenesisHash", () => {
  it("returns 64 zeros", () => {
    expect(getGenesisHash()).toBe("0".repeat(64));
  });
});

describe("randomHex", () => {
  it("returns hex string of expected length", () => {
    const h = randomHex(16);
    expect(h).toMatch(/^[a-f0-9]{32}$/);
  });

  it("returns different values each call", () => {
    const h1 = randomHex(32);
    const h2 = randomHex(32);
    expect(h1).not.toBe(h2);
  });
});

describe("computeMerkleRoot", () => {
  it("returns hash of empty for no hashes", () => {
    const root = computeMerkleRoot([]);
    expect(root).toMatch(/^[a-f0-9]{64}$/);
    expect(root).toBe(sha256("empty"));
  });

  it("returns leaf for single hash", () => {
    const leaf = "a".repeat(64);
    expect(computeMerkleRoot([leaf])).toBe(leaf);
  });

  it("computes root for two hashes", () => {
    const h1 = "a".repeat(64);
    const h2 = "b".repeat(64);
    const root = computeMerkleRoot([h1, h2]);
    expect(root).toMatch(/^[a-f0-9]{64}$/);
    expect(root).toBe(sha256(h1 + h2));
  });

  it("computes root for multiple hashes", () => {
    const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)];
    const root = computeMerkleRoot(hashes);
    expect(root).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("computeMerkleProof and verifyMerkleProof", () => {
  it("generates valid proof for first leaf", () => {
    const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)];
    const root = computeMerkleRoot(hashes);
    const proof = computeMerkleProof(hashes, 0);
    expect(verifyMerkleProof(hashes[0], proof, root)).toBe(true);
  });

  it("generates valid proof for last leaf", () => {
    const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)];
    const root = computeMerkleRoot(hashes);
    const proof = computeMerkleProof(hashes, 3);
    expect(verifyMerkleProof(hashes[3], proof, root)).toBe(true);
  });

  it("rejects invalid leaf", () => {
    const hashes = ["a".repeat(64), "b".repeat(64)];
    const root = computeMerkleRoot(hashes);
    const proof = computeMerkleProof(hashes, 0);
    expect(verifyMerkleProof("x".repeat(64), proof, root)).toBe(false);
  });

  it("rejects invalid root", () => {
    const hashes = ["a".repeat(64), "b".repeat(64)];
    const proof = computeMerkleProof(hashes, 0);
    expect(verifyMerkleProof(hashes[0], proof, "x".repeat(64))).toBe(false);
  });
});
