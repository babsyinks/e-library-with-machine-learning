import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>("SMTP_HOST");
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>("SMTP_PORT", 587),
          secure: config.get<number>("SMTP_PORT", 587) === 465,
          auth: config.get<string>("SMTP_USER")
            ? {
                user: config.get<string>("SMTP_USER"),
                pass: config.get<string>("SMTP_PASSWORD"),
              }
            : undefined,
        })
      : null;
  }

  async sendVerification(email: string, name: string, token: string) {
    const link = `${this.config.getOrThrow("WEB_URL")}/auth/verify?token=${encodeURIComponent(token)}`;
    await this.send(
      email,
      "Verify your ScholarShelf account",
      name,
      link,
      "Verify email",
    );
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const link = `${this.config.getOrThrow("WEB_URL")}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(
      email,
      "Reset your ScholarShelf password",
      name,
      link,
      "Reset password",
    );
  }

  private async send(
    to: string,
    subject: string,
    name: string,
    link: string,
    action: string,
  ) {
    if (!this.transporter) {
      if (this.config.get("MAIL_LOG_LINKS", "false") === "true") {
        this.logger.log(`[development mail] ${subject} for ${to}: ${link}`);
      }
      return;
    }
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>("SMTP_FROM"),
      to,
      subject,
      text: `Hello ${name},\n\n${action}: ${link}\n\nThis link expires soon. If you did not request it, ignore this message.`,
      html: `<p>Hello ${this.escape(name)},</p><p><a href="${link}">${action}</a></p><p>This link expires soon. If you did not request it, ignore this message.</p>`,
    });
  }

  private escape(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]!,
    );
  }
}
