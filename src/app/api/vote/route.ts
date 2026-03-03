import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  hashToken,
  computeVoteHash,
  getGenesisHash,
} from "@/lib/crypto";

const schema = z.object({
  token: z.string().length(64).regex(/^[a-f0-9]+$/),
  candidate_id: z.string().cuid(),
  electionId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, candidate_id, electionId } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true },
    });
    if (!election || election.status !== "open") {
      return NextResponse.json(
        { error: "Election not found or not open" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const votingToken = await prisma.votingToken.findFirst({
      where: { electionId, tokenHash },
    });
    if (!votingToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }
    if (votingToken.used) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 400 }
      );
    }
    if (votingToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    const candidateExists = election.candidates.some((c) => c.id === candidate_id);
    if (!candidateExists) {
      return NextResponse.json(
        { error: "Invalid candidate" },
        { status: 400 }
      );
    }

    const lastVote = await prisma.vote.findFirst({
      where: { electionId },
      orderBy: { createdAt: "desc" },
    });
    const previousHash = lastVote?.currentHash ?? getGenesisHash();
    const now = new Date();
    const currentHash = computeVoteHash(candidate_id, now, previousHash);

    await prisma.$transaction([
      prisma.vote.create({
        data: {
          electionId,
          candidateId: candidate_id,
          previousHash,
          currentHash,
        },
      }),
      prisma.votingToken.update({
        where: { id: votingToken.id },
        data: { used: true },
      }),
      ...(votingToken.voterId
        ? [
            prisma.voter.update({
              where: { id: votingToken.voterId },
              data: { hasVoted: true },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      message: "Vote recorded in tamper-evident ledger",
      receipt: currentHash,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
