import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeMerkleProof, verifyMerkleProof } from "@/lib/crypto";

const schema = z.object({
  electionId: z.string().cuid(),
  voteHash: z.string().length(64).regex(/^[a-f0-9]+$/),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");
    const voteHash = searchParams.get("voteHash");
    const parsed = schema.safeParse({ electionId, voteHash });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "electionId and voteHash (64-char hex) required" },
        { status: 400 }
      );
    }

    const election = await prisma.election.findUnique({
      where: { id: parsed.data.electionId },
    });
    if (!election || election.status !== "closed") {
      return NextResponse.json(
        { error: "Election not found or not closed" },
        { status: 404 }
      );
    }

    const votes = await prisma.vote.findMany({
      where: { electionId: parsed.data.electionId },
      orderBy: { createdAt: "asc" },
    });
    const hashes = votes.map((v) => v.currentHash);
    const leafIndex = hashes.indexOf(parsed.data.voteHash);

    if (leafIndex === -1) {
      return NextResponse.json({
        verified: false,
        merkleRoot: election.merkleRoot,
        message: "Vote hash not found in ledger",
      });
    }

    const proof = computeMerkleProof(hashes, leafIndex);
    const verified = verifyMerkleProof(
      parsed.data.voteHash,
      proof,
      election.merkleRoot!
    );

    return NextResponse.json({
      verified,
      merkleRoot: election.merkleRoot,
      proof: proof.map((p) => ({ hash: p.hash, position: p.position })),
    });
  } catch {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
