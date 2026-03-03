import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // draft | open | closed

    const elections = await prisma.election.findMany({
      where: status ? { status } : undefined,
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
