import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomHex } from "@/lib/crypto";

const schema = z.object({
  name: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = schema.parse(body);

    const salt = randomHex(16);
    const election = await prisma.election.create({
      data: {
        name,
        salt,
        status: "draft",
      },
    });

    return NextResponse.json({
      id: election.id,
      name: election.name,
      status: election.status,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create election" },
      { status: 500 }
    );
  }
}
