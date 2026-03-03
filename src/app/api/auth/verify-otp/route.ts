import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashEmail, hashToken, randomHex } from "@/lib/crypto";
import { verifyOtpHash, MAX_ATTEMPTS } from "@/lib/otp";

const schema = z.object({
  flat_number: z.string().min(1),
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/),
  electionId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { flat_number, email, otp, electionId } = schema.parse(body);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election || election.status !== "open") {
      return NextResponse.json(
        { error: "Election not found or not open" },
        { status: 400 }
      );
    }

    const emailHash = hashEmail(email, election.salt);

    const session = await prisma.otpSession.findFirst({
      where: { electionId, emailHash },
      orderBy: { createdAt: "desc" },
    });
    if (!session) {
      return NextResponse.json(
        { error: "No OTP session found. Request a new OTP." },
        { status: 400 }
      );
    }
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "OTP expired. Request a new one." },
        { status: 400 }
      );
    }
    if (session.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Request a new OTP." },
        { status: 400 }
      );
    }

    const valid = verifyOtpHash(otp, session.sessionSalt, session.otpHash);
    if (!valid) {
      await prisma.otpSession.update({
        where: { id: session.id },
        data: { attempts: session.attempts + 1 },
      });
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    const voter = await prisma.voter.findFirst({
      where: {
        electionId,
        flatNumber: String(flat_number).trim(),
        emailHash,
      },
    });
    if (!voter) {
      return NextResponse.json(
        { error: "Voter not found" },
        { status: 400 }
      );
    }
    if (voter.tokenIssued) {
      return NextResponse.json(
        { error: "You have already received a voting token. Use it to cast your vote, or you have already voted." },
        { status: 400 }
      );
    }

    const rawToken = randomHex(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.$transaction([
      prisma.votingToken.create({
        data: {
          electionId,
          voterId: voter.id,
          tokenHash,
          expiresAt,
        },
      }),
      prisma.voter.update({
        where: { id: voter.id },
        data: { tokenIssued: true },
      }),
    ]);

    return NextResponse.json({
      voting_token: rawToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
