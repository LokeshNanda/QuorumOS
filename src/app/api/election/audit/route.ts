import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  electionId: z.string().cuid(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");
    const parsed = schema.safeParse({ electionId });
    if (!parsed.success || !electionId) {
      return NextResponse.json(
        { error: "electionId is required" },
        { status: 400 }
      );
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        voters: true,
        candidates: true,
        votes: true,
      },
    });
    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    const votesByCandidate = election.votes.reduce(
      (acc, v) => {
        acc[v.candidateId] = (acc[v.candidateId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const candidateTally = election.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      votes: votesByCandidate[c.id] ?? 0,
    }));

    const lastVote = election.votes[election.votes.length - 1];
    const finalLedgerHash = lastVote?.currentHash ?? null;

    const audit = {
      electionId: election.id,
      name: election.name,
      status: election.status,
      closedAt: election.closedAt?.toISOString() ?? null,
      merkleRoot: election.merkleRoot,
      totalEligibleVoters: election.voters.length,
      totalOtpVerified: await prisma.otpSession.count({
        where: { electionId },
      }),
      totalVotesCast: election.votes.length,
      candidateTally,
      finalLedgerHash,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(audit);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate audit" },
      { status: 500 }
    );
  }
}
