/**
 * Notification Provider Abstraction
 * Per docs/09-notification-provider.md
 * Pluggable providers via NOTIFICATION_PROVIDER env
 */

export interface NotificationProvider {
  sendOTP(email: string, otp: string): Promise<void>;
}

class ResendProvider implements NotificationProvider {
  private fromEmail: string;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from) {
      throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set");
    }
    this.fromEmail = from;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: "Your QuorumOS Voting Code",
      html: `
        <p>Your one-time verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 5 minutes. Do not share it with anyone.</p>
        <p>If you did not request this code, please ignore this email.</p>
      `,
    });
    if (error) {
      throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
    }
  }
}

class ConsoleProvider implements NotificationProvider {
  async sendOTP(email: string, otp: string): Promise<void> {
    console.log(`[OTP] To: ${email} | Code: ${otp}`);
  }
}

let _provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (!_provider) {
    const type = process.env.NOTIFICATION_PROVIDER || "console";
    if (type === "resend") {
      _provider = new ResendProvider();
    } else {
      _provider = new ConsoleProvider();
    }
  }
  return _provider;
}
