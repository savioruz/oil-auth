import type { Config } from '@config/config';
import type { Logger } from '@infras/logger/logger';
import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class SmtpClient {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(
    private config: NonNullable<Config['smtp']>,
    private logger?: Logger
  ) {
    this.from = config.fromName
      ? `${config.fromName} <${config.from}>`
      : config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.password
        ? { auth: { user: config.user, pass: config.password } }
        : {}),
    });
  }

  async sendMail(options: MailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (err) {
      this.logger?.error({ err }, `SMTP sendMail failed to=${options.to}`);
      throw err;
    }
  }

  async verify(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger?.info(`SMTP connected host=${this.config.host} port=${this.config.port}`);
    } catch (err) {
      this.logger?.error({ err }, `SMTP verify failed host=${this.config.host}`);
      throw err;
    }
  }
}

export function createSmtpClient(config: Config, logger?: Logger): SmtpClient | null {
  if (!config.smtp) return null;
  return new SmtpClient(config.smtp, logger);
}
