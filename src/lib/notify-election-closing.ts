import { prisma } from "@/lib/db";
import { getNotificationProvider } from "./notification-provider";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function sendElectionClosingReminders(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const elections = await prisma.election.findMany({
    where: {
      status: "open",
      closesAt: { not: null, gte: now, lte: in24h },
      closingReminderSentAt: null,
    },
  });

  const provider = getNotificationProvider();
  const sendReminder = provider.sendElectionClosingReminder;
  if (!sendReminder) return 0;

  const voteUrl = `${getBaseUrl()}/vote`;
  let totalSent = 0;

  for (const election of elections) {
    if (!election.closesAt) continue;

    const notifications = await prisma.electionNotification.findMany({
      where: { electionId: election.id },
    });

    for (const n of notifications) {
      try {
        await sendReminder(n.email, election.name, voteUrl, election.closesAt);
        totalSent++;
      } catch (err) {
        console.error(`Failed to send closing reminder to ${n.email}:`, err);
      }
    }

    await prisma.election.update({
      where: { id: election.id },
      data: { closingReminderSentAt: now },
    });
  }

  return totalSent;
}
