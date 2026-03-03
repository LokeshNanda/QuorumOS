import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashEmail } from "@/lib/crypto";

const deleteSchema = z.object({
  electionId: z.string().cuid(),
  voterId: z.string().cuid(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");
    if (!electionId) {
      return NextResponse.json(
        { error: "electionId required" },
        { status: 400 }
      );
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }

    const voters = await prisma.voter.findMany({
      where: { electionId },
      select: { id: true, flatNumber: true },
      orderBy: [{ flatNumber: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(voters);
  } catch {
    return NextResponse.json(
      { error: "Failed to list voters" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { electionId, voterId } = deleteSchema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }

    const voter = await prisma.voter.findFirst({
      where: { id: voterId, electionId },
    });
    if (!voter) {
      return NextResponse.json(
        { error: "Voter not found" },
        { status: 404 }
      );
    }

    const notifications = await prisma.electionNotification.findMany({
      where: { electionId },
    });
    const matchingNotification = notifications.find(
      (n) => hashEmail(n.email, election.salt) === voter.emailHash
    );

    await prisma.$transaction([
      prisma.voter.delete({ where: { id: voterId } }),
      ...(matchingNotification
        ? [
            prisma.electionNotification.delete({
              where: { id: matchingNotification.id },
            }),
          ]
        : []),
    ]);

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
      { error: "Failed to remove voter" },
      { status: 500 }
    );
  }
}
