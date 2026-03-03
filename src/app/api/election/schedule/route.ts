import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  electionId: z.string().cuid(),
  opensAt: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  closesAt: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { electionId, opensAt, closesAt } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "draft") {
      return NextResponse.json(
        { error: "Election not found or not in draft" },
        { status: 400 }
      );
    }

    const data: { opensAt?: Date | null; closesAt?: Date | null } = {};
    if (opensAt !== undefined) data.opensAt = opensAt;
    if (closesAt !== undefined) data.closesAt = closesAt;

    await prisma.election.update({
      where: { id: electionId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}
