import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const elections = await prisma.election.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { voters: true, candidates: true, votes: true },
        },
      },
    });
    return NextResponse.json(elections);
  } catch {
    return NextResponse.json(
      { error: "Failed to list elections" },
      { status: 500 }
    );
  }
}
