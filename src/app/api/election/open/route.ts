import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  electionId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { electionId } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }
    if (election.candidates.length === 0) {
      return NextResponse.json(
        { error: "Add at least one candidate before opening" },
        { status: 400 }
      );
    }

    await prisma.election.update({
      where: { id: electionId },
      data: { status: "open" },
    });

    return NextResponse.json({ success: true, status: "open" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to open election" },
      { status: 500 }
    );
  }
}
