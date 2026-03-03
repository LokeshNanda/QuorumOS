/**
 * Notification Provider Abstraction
 * Per docs/09-notification-provider.md
 * Pluggable providers via NOTIFICATION_PROVIDER env
 */

export interface NotificationProvider {
  sendOTP(email: string, otp: string): Promise<void>;
  sendElectionOpen?(email: string, electionName: string, voteUrl: string): Promise<void>;
  sendElectionClosingReminder?(
    email: string,
    electionName: string,
    voteUrl: string,
    closesAt: Date
  ): Promise<void>;
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

  async sendElectionOpen(email: string, electionName: string, voteUrl: string): Promise<void> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Election Open: ${electionName}`,
      html: `
        <p>The election <strong>${electionName}</strong> is now open for voting.</p>
        <p><a href="${voteUrl}">Cast your vote here</a></p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
    if (error) {
      throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
    }
  }

  async sendElectionClosingReminder(
    email: string,
    electionName: string,
    voteUrl: string,
    closesAt: Date
  ): Promise<void> {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const closesStr = closesAt.toLocaleString();
    const { error } = await resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Reminder: ${electionName} closes soon`,
      html: `
        <p>The election <strong>${electionName}</strong> will close at ${closesStr}.</p>
        <p><a href="${voteUrl}">Cast your vote here</a> before it closes.</p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
    if (error) {
      throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
    }
  }
}

class SendGridProvider implements NotificationProvider {
  private fromEmail: string;

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM_EMAIL;
    if (!key || !from) {
      throw new Error("SENDGRID_API_KEY and SENDGRID_FROM_EMAIL must be set");
    }
    this.fromEmail = from;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: email,
      from: this.fromEmail,
      subject: "Your QuorumOS Voting Code",
      html: `
        <p>Your one-time verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 5 minutes. Do not share it with anyone.</p>
        <p>If you did not request this code, please ignore this email.</p>
      `,
    });
  }

  async sendElectionOpen(email: string, electionName: string, voteUrl: string): Promise<void> {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: email,
      from: this.fromEmail,
      subject: `Election Open: ${electionName}`,
      html: `
        <p>The election <strong>${electionName}</strong> is now open for voting.</p>
        <p><a href="${voteUrl}">Cast your vote here</a></p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
  }

  async sendElectionClosingReminder(
    email: string,
    electionName: string,
    voteUrl: string,
    closesAt: Date
  ): Promise<void> {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    const closesStr = closesAt.toLocaleString();
    await sgMail.send({
      to: email,
      from: this.fromEmail,
      subject: `Reminder: ${electionName} closes soon`,
      html: `
        <p>The election <strong>${electionName}</strong> will close at ${closesStr}.</p>
        <p><a href="${voteUrl}">Cast your vote here</a> before it closes.</p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
  }
}

class SmtpProvider implements NotificationProvider {
  private fromEmail: string;
  private createTransporter: () => Promise<import("nodemailer").Transporter>;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const from = process.env.SMTP_FROM_EMAIL;
    if (!host || !port || !from) {
      throw new Error("SMTP_HOST, SMTP_PORT, and SMTP_FROM_EMAIL must be set");
    }
    this.fromEmail = from;
    this.createTransporter = async () => {
      const nodemailer = await import("nodemailer");
      return nodemailer.default.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port === "465",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    };
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const transporter = await this.createTransporter();
    await transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: "Your QuorumOS Voting Code",
      html: `
        <p>Your one-time verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 5 minutes. Do not share it with anyone.</p>
        <p>If you did not request this code, please ignore this email.</p>
      `,
    });
  }

  async sendElectionOpen(email: string, electionName: string, voteUrl: string): Promise<void> {
    const transporter = await this.createTransporter();
    await transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: `Election Open: ${electionName}`,
      html: `
        <p>The election <strong>${electionName}</strong> is now open for voting.</p>
        <p><a href="${voteUrl}">Cast your vote here</a></p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
  }

  async sendElectionClosingReminder(
    email: string,
    electionName: string,
    voteUrl: string,
    closesAt: Date
  ): Promise<void> {
    const transporter = await this.createTransporter();
    const closesStr = closesAt.toLocaleString();
    await transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: `Reminder: ${electionName} closes soon`,
      html: `
        <p>The election <strong>${electionName}</strong> will close at ${closesStr}.</p>
        <p><a href="${voteUrl}">Cast your vote here</a> before it closes.</p>
        <p>If you did not expect this email, please ignore it.</p>
      `,
    });
  }
}

class TestFileProvider implements NotificationProvider {
  private filePath: string;

  constructor() {
    const path = process.env.TEST_OTP_FILE;
    if (!path) throw new Error("TEST_OTP_FILE must be set for test provider");
    this.filePath = path;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const fs = await import("fs/promises");
    await fs.writeFile(
      this.filePath,
      JSON.stringify({ email, otp, at: new Date().toISOString() }),
      "utf8"
    );
  }

  async sendElectionOpen(): Promise<void> {}
  async sendElectionClosingReminder(): Promise<void> {}
}

class ConsoleProvider implements NotificationProvider {
  async sendOTP(email: string, otp: string): Promise<void> {
    console.log(`[OTP] To: ${email} | Code: ${otp}`);
  }

  async sendElectionOpen(email: string, electionName: string, voteUrl: string): Promise<void> {
    console.log(`[Election Open] To: ${email} | ${electionName} | ${voteUrl}`);
  }

  async sendElectionClosingReminder(
    email: string,
    electionName: string,
    voteUrl: string,
    closesAt: Date
  ): Promise<void> {
    console.log(
      `[Election Closing Reminder] To: ${email} | ${electionName} | closes ${closesAt.toISOString()} | ${voteUrl}`
    );
  }
}

let _provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  if (!_provider) {
    const type = process.env.NOTIFICATION_PROVIDER || "console";
    if (type === "resend") {
      _provider = new ResendProvider();
    } else if (type === "sendgrid") {
      _provider = new SendGridProvider();
    } else if (type === "smtp") {
      _provider = new SmtpProvider();
    } else if (type === "test-file" && process.env.TEST_OTP_FILE) {
      _provider = new TestFileProvider();
    } else {
      _provider = new ConsoleProvider();
    }
  }
  return _provider;
}
