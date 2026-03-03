import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AuditPdfDocument } from "@/lib/audit-pdf";

const schema = z.object({
  electionId: z.string().cuid(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get("electionId");
    const parsed = schema.safeParse({ electionId });
    if (!parsed.success || !electionId) {
      return NextResponse.json(
        { error: "electionId is required" },
        { status: 400 }
      );
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        voters: true,
        candidates: true,
        votes: true,
      },
    });
    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 });
    }

    const votesByCandidate = election.votes.reduce(
      (acc, v) => {
        acc[v.candidateId] = (acc[v.candidateId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const candidateTally = election.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      votes: votesByCandidate[c.id] ?? 0,
    }));

    const lastVote = election.votes[election.votes.length - 1];
    const finalLedgerHash = lastVote?.currentHash ?? null;

    const audit = {
      electionId: election.id,
      name: election.name,
      status: election.status,
      closedAt: election.closedAt?.toISOString() ?? null,
      merkleRoot: election.merkleRoot,
      totalEligibleVoters: election.voters.length,
      totalOtpVerified: await prisma.otpSession.count({
        where: { electionId },
      }),
      totalVotesCast: election.votes.length,
      candidateTally,
      finalLedgerHash,
      generatedAt: new Date().toISOString(),
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(AuditPdfDocument, { audit }) as Parameters<typeof renderToBuffer>[0]
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quorumos-audit-${electionId}-${Date.now()}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
