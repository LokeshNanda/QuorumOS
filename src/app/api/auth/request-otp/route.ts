import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashEmail, hashOtp, randomHex } from "@/lib/crypto";
import { generateOtp, getOtpExpiry } from "@/lib/otp";
import { getNotificationProvider } from "@/lib/notification-provider";
import { checkOtpRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  flat_number: z.string().min(1),
  email: z.string().email(),
  electionId: z.string().cuid(),
});

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { flat_number, email, electionId } = schema.parse(body);

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

    const voter = await prisma.voter.findFirst({
      where: {
        electionId,
        flatNumber: String(flat_number).trim(),
        emailHash,
      },
    });
    if (!voter) {
      return NextResponse.json(
        { error: "No matching voter found for this flat and email" },
        { status: 404 }
      );
    }
    if (voter.hasVoted) {
      return NextResponse.json(
        { error: "You have already voted" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const [emailLimit, ipLimit] = await Promise.all([
      checkOtpRateLimit(emailHash, "email"),
      checkOtpRateLimit(ip, "ip"),
    ]);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const sessionSalt = randomHex(16);
    const otpHash = hashOtp(otp, sessionSalt);
    const expiresAt = getOtpExpiry();

    await prisma.otpSession.create({
      data: {
        electionId,
        emailHash,
        otpHash,
        sessionSalt,
        expiresAt,
      },
    });

    const provider = getNotificationProvider();
    await provider.sendOTP(email, otp);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 }
      );
    }
    const message = e instanceof Error ? e.message : "Failed to send OTP";
    console.error("[request-otp]", e);
    return NextResponse.json(
      { error: "Failed to send OTP", details: message },
      { status: 500 }
    );
  }
}
