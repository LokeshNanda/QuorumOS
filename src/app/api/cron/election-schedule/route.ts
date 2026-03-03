/**
 * Cron endpoint to process scheduled elections
 * Call via Vercel Cron or external cron (e.g. every minute)
 * Protect with CRON_SECRET in production
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeMerkleRoot } from "@/lib/crypto";
import { sendElectionOpenNotifications } from "@/lib/notify-election-open";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const opened: string[] = [];
  const closed: string[] = [];

  const toOpen = await prisma.election.findMany({
    where: {
      status: "draft",
      opensAt: { not: null, lte: now },
    },
  });

  for (const e of toOpen) {
    if (e.opensAt) {
      const hasCandidates = await prisma.candidate.count({
        where: { electionId: e.id },
      });
      if (hasCandidates > 0) {
        await prisma.election.update({
          where: { id: e.id },
          data: { status: "open" },
        });
        await sendElectionOpenNotifications(e.id);
        opened.push(e.id);
      }
    }
  }

  const toClose = await prisma.election.findMany({
    where: {
      status: "open",
      closesAt: { not: null, lte: now },
    },
  });

  for (const e of toClose) {
    if (e.closesAt) {
      const votes = await prisma.vote.findMany({
        where: { electionId: e.id },
        orderBy: { createdAt: "asc" },
      });
      const hashes = votes.map((v) => v.currentHash);
      const merkleRoot = computeMerkleRoot(hashes);

      await prisma.election.update({
        where: { id: e.id },
        data: {
          status: "closed",
          merkleRoot,
          closedAt: now,
        },
      });
      closed.push(e.id);
    }
  }

  return NextResponse.json({
    success: true,
    opened,
    closed,
    processedAt: now.toISOString(),
  });
}
