import { prisma } from "@/lib/db";
import { getNotificationProvider } from "./notification-provider";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendElectionOpenNotifications(electionId: string): Promise<number> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election || election.status !== "open") return 0;

  const pending = await prisma.electionNotification.findMany({
    where: { electionId, sentAt: null },
  });

  const provider = getNotificationProvider();
  const sendElectionOpen = provider.sendElectionOpen;
  if (!sendElectionOpen) return 0;

  const voteUrl = `${getBaseUrl()}/vote`;
  let sent = 0;

  for (const n of pending) {
    try {
      await sendElectionOpen(n.email, election.name, voteUrl);
      await prisma.electionNotification.update({
        where: { id: n.id },
        data: { sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send election open to ${n.email}:`, err);
    }
  }

  return sent;
}
