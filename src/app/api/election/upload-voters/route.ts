import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashEmail } from "@/lib/crypto";

const schema = z.object({
  electionId: z.string().cuid(),
  voters: z.array(
    z.object({
      flat_number: z.string(),
      email: z.string().email(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { electionId, voters } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }

    const toCreate = voters.map((v) => ({
      electionId,
      flatNumber: String(v.flat_number).trim(),
      emailHash: hashEmail(v.email, election.salt),
    }));

    await prisma.voter.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    await prisma.electionNotification.createMany({
      data: voters.map((v) => ({
        electionId,
        email: v.email.trim().toLowerCase(),
      })),
      skipDuplicates: true,
    });

    const count = await prisma.voter.count({ where: { electionId } });
    return NextResponse.json({ success: true, totalVoters: count });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to upload voters" },
      { status: 500 }
    );
  }
}
