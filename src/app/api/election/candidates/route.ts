import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  electionId: z.string().cuid(),
  name: z.string().min(1).max(200),
});

const listSchema = z.object({
  electionId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { electionId, name } = createSchema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: { electionId, name: name.trim() },
    });
    return NextResponse.json(candidate);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add candidate" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");
    const parsed = listSchema.safeParse({ electionId });
    if (!parsed.success || !electionId) {
      return NextResponse.json(
        { error: "electionId is required" },
        { status: 400 }
      );
    }

    const candidates = await prisma.candidate.findMany({
      where: { electionId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(candidates);
  } catch {
    return NextResponse.json(
      { error: "Failed to list candidates" },
      { status: 500 }
    );
  }
}
