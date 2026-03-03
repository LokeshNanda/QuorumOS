import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
