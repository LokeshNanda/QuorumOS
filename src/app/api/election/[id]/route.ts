import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        candidates: true,
        _count: {
          select: { voters: true, votes: true },
        },
      },
    });
    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }
    return NextResponse.json(election);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch election" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = patchSchema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id },
    });
    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }
    if (election.status !== "draft") {
      return NextResponse.json(
        { error: "Can only edit election name when in draft" },
        { status: 400 }
      );
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { name: name.trim() },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update election" },
      { status: 500 }
    );
  }
}
