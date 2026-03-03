/**
 * API integration tests for election flow.
 * Requires DATABASE_URL (or DATABASE_URL_TEST) to be set.
 * Run: npm test -- src/__tests__/api-election.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";

const capturedOtp = { value: "" };

vi.mock("@/lib/notification-provider", () => ({
  getNotificationProvider: () => ({
    sendOTP: async (_email: string, otp: string) => {
      capturedOtp.value = otp;
    },
    sendElectionOpen: async () => {},
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkOtpRateLimit: async () => ({ allowed: true, remaining: 5 }),
}));

async function jsonPost(
  handler: (req: Request) => Promise<Response>,
  url: string,
  body: object
) {
  const res = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, data: await res.json() };
}

async function jsonGet(handler: (req: Request) => Promise<Response>, url: string) {
  const res = await handler(new Request(url));
  return { status: res.status, data: await res.json() };
}

describe("API election flow", () => {
  let electionId: string;
  let candidateId: string;
  let votingToken: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      console.warn("Skipping API integration tests: no DATABASE_URL");
      return;
    }
  });

  afterAll(async () => {
    if (electionId) {
      await prisma.election.delete({ where: { id: electionId } }).catch(() => {});
    }
  });

  it("creates election", async () => {
    const { POST } = await import("@/app/api/election/create/route");
    const { status, data } = await jsonPost(POST, "http://localhost/api/election/create", {
      name: "Integration Test Election",
    });
    expect(status).toBe(200);
    expect(data.id).toBeDefined();
    expect(data.status).toBe("draft");
    electionId = data.id;
  });

  it("uploads voters", async () => {
    const { POST } = await import("@/app/api/election/upload-voters/route");
    const { status, data } = await jsonPost(POST, "http://localhost/api/election/upload-voters", {
      electionId,
      voters: [
        { flat_number: "101", email: "voter1@test.example" },
        { flat_number: "102", email: "voter2@test.example" },
      ],
    });
    expect(status).toBe(200);
    expect(data.totalVoters).toBe(2);
  });

  it("adds candidates", async () => {
    const { POST } = await import("@/app/api/election/candidates/route");
    const { status, data } = await jsonPost(POST, "http://localhost/api/election/candidates", {
      electionId,
      name: "Candidate A",
    });
    expect(status).toBe(200);
    expect(data.id).toBeDefined();
    candidateId = data.id;

    await jsonPost(POST, "http://localhost/api/election/candidates", {
      electionId,
      name: "Candidate B",
    });
  });

  it("opens election", async () => {
    const { POST } = await import("@/app/api/election/open/route");
    const { status } = await jsonPost(POST, "http://localhost/api/election/open", {
      electionId,
    });
    expect(status).toBe(200);
  });

  it("request OTP and verify to get token", async () => {
    const { POST: requestOtp } = await import("@/app/api/auth/request-otp/route");
    const { POST: verifyOtp } = await import("@/app/api/auth/verify-otp/route");

    const otpRes = await jsonPost(requestOtp, "http://localhost/api/auth/request-otp", {
      flat_number: "101",
      email: "voter1@test.example",
      electionId,
    });
    expect(otpRes.status).toBe(200);

    const verifyRes = await jsonPost(verifyOtp, "http://localhost/api/auth/verify-otp", {
      flat_number: "101",
      email: "voter1@test.example",
      otp: capturedOtp.value,
      electionId,
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.data.voting_token).toBeDefined();
    votingToken = verifyRes.data.voting_token;
  });

  it("casts vote", async () => {
    const { POST } = await import("@/app/api/vote/route");
    const { status, data } = await jsonPost(POST, "http://localhost/api/vote", {
      token: votingToken,
      candidate_id: candidateId,
      electionId,
    });
    expect(status).toBe(200);
    expect(data.receipt).toBeDefined();
  });

  it("closes election", async () => {
    const { POST } = await import("@/app/api/election/close/route");
    const { status } = await jsonPost(POST, "http://localhost/api/election/close", {
      electionId,
    });
    expect(status).toBe(200);
  });

  it("returns audit", async () => {
    const { GET } = await import("@/app/api/election/audit/route");
    const { status, data } = await jsonGet(
      GET,
      `http://localhost/api/election/audit?electionId=${electionId}`
    );
    expect(status).toBe(200);
    expect(data.totalEligibleVoters).toBe(2);
    expect(data.totalVotesCast).toBe(1);
    expect(data.candidateTally).toHaveLength(2);
    expect(data.merkleRoot).toBeDefined();
  });
});
