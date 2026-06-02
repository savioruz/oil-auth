import type { Config } from '@config/config';
import type { Logger } from '@infras/logger/logger';
import type { Otel } from '@infras/otel/otel';
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
    private otel?: Otel,
    private logger?: Logger
  ) {
    this.from = config.fromName ? `${config.fromName} <${config.from}>` : config.from;
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
    const [_ctx, scope] = this.otel?.newScope(undefined, 'smtp', 'send-mail') ?? [];
    scope?.setAttribute('smtp.to', options.to);
    scope?.setAttribute('smtp.subject', options.subject);
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
      scope?.traceError(err as Error);
      throw err;
    } finally {
      scope?.end();
    }
  }

  async verify(): Promise<void> {
    const [_ctx, scope] = this.otel?.newScope(undefined, 'smtp', 'verify') ?? [];
    try {
      await this.transporter.verify();
      this.logger?.info(`SMTP connected host=${this.config.host} port=${this.config.port}`);
    } catch (err) {
      this.logger?.error({ err }, `SMTP verify failed host=${this.config.host}`);
      scope?.traceError(err as Error);
      throw err;
    } finally {
      scope?.end();
    }
  }
}

export function createSmtpClient(config: Config, otel?: Otel, logger?: Logger): SmtpClient | null {
  if (!config.smtp) return null;
  return new SmtpClient(config.smtp, otel, logger);
}
