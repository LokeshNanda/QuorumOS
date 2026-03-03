import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeMerkleRoot } from "@/lib/crypto";

const schema = z.object({
  electionId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { electionId } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "open") {
      return NextResponse.json(
        { error: "Election not found or not open" },
        { status: 400 }
      );
    }

    const votes = await prisma.vote.findMany({
      where: { electionId },
      orderBy: { createdAt: "asc" },
    });
    const hashes = votes.map((v) => v.currentHash);
    const merkleRoot = computeMerkleRoot(hashes);

    await prisma.election.update({
      where: { id: electionId },
      data: {
        status: "closed",
        merkleRoot,
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      merkleRoot,
      voteCount: votes.length,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to close election" },
      { status: 500 }
    );
  }
}
