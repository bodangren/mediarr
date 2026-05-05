import type { Notification } from '@prisma/client';
import { readBoolean, readNotificationConfig, readNumber, readString } from './config';
import type { NotificationEvent, NotificationTransport } from './transport';

export interface EmailTransporter {
  sendMail(mail: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
}

export type CreateTransportFn = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass?: string | undefined;
  } | undefined;
}) => Promise<EmailTransporter> | EmailTransporter;

export class EmailTransport implements NotificationTransport {
  constructor(private readonly createTransport: CreateTransportFn = defaultCreateTransport) {}

  async send(notification: Notification, event: NotificationEvent): Promise<void> {
    const config = readNotificationConfig(notification);

    const host = readString(config, 'smtpHost', 'server');
    const port = readNumber(config, 'smtpPort', 'port') ?? 587;
    const username = readString(config, 'smtpUser', 'username');
    const password = readString(config, 'smtpPass', 'password') ?? undefined;
    const fromAddress = readString(config, 'from', 'fromAddress', 'smtpUser', 'username');
    const toAddress = readString(config, 'to', 'toAddress');
    const secure = readBoolean(config, 'smtpSecure', 'useSsl') ?? port === 465;

    if (!host) {
      throw new Error('Email transport is missing SMTP host');
    }
    if (!fromAddress) {
      throw new Error('Email transport is missing from address');
    }
    if (!toAddress) {
      throw new Error('Email transport is missing recipient address');
    }

    const transporter = await this.createTransport({
      host,
      port,
      secure,
      auth: username
        ? {
            user: username,
            pass: password,
          }
        : undefined,
    });

    const text = formatEmailBody(event);
    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: event.title,
      text,
    });
  }
}

async function defaultCreateTransport(options: {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass?: string | undefined;
  } | undefined;
}): Promise<EmailTransporter> {
  const nodemailerModule = await import('nodemailer');
  const nodemailer = (nodemailerModule.default ?? nodemailerModule) as {
    createTransport: (opts: typeof options) => EmailTransporter;
  };

  return nodemailer.createTransport(options);
}

function formatEmailBody(event: NotificationEvent): string {
  const lines = [event.message];
  const data = event.data ?? {};
  if (Object.keys(data).length > 0) {
    lines.push('');
    lines.push('Details:');
    for (const [key, value] of Object.entries(data)) {
      lines.push(`- ${key}: ${stringifyValue(value)}`);
    }
  }
  return lines.join('\n');
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return 'null';
  return JSON.stringify(value);
}
