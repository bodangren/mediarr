import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@prisma/client';
import { EmailTransport, type EmailTransporter } from './EmailTransport';
import type { NotificationEvent } from './transport';

function makeNotification(config: Record<string, unknown>): Notification {
  return {
    id: 1,
    name: 'Email transport',
    type: 'email',
    enabled: true,
    onGrab: true,
    onDownload: true,
    onUpgrade: false,
    onRename: false,
    onSeriesAdd: false,
    onEpisodeDelete: false,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const event: NotificationEvent = {
  type: 'download',
  title: 'Download Completed',
  message: 'Dune Part Two finished downloading',
  data: { quality: '2160p' },
};

describe('EmailTransport', () => {
  it('creates transporter with SMTP config and sends email', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const createTransport = vi.fn().mockResolvedValue({ sendMail } satisfies EmailTransporter);
    const transport = new EmailTransport(createTransport);

    await transport.send(
      makeNotification({
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpUser: 'mailer@example.com',
        smtpPass: 'secret',
        from: 'mediarr@example.com',
        to: 'user@example.com',
      }),
      event,
    );

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'mailer@example.com',
        pass: 'secret',
      },
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'mediarr@example.com',
        to: 'user@example.com',
        subject: 'Download Completed',
      }),
    );
  });

  it('throws when SMTP config is missing', async () => {
    const transport = new EmailTransport(
      vi.fn().mockResolvedValue({
        sendMail: vi.fn().mockResolvedValue(undefined),
      } satisfies EmailTransporter),
    );

    await expect(
      transport.send(makeNotification({}), event),
    ).rejects.toThrow('Email transport is missing SMTP host');
  });

  it('propagates SMTP send failures', async () => {
    const createTransport = vi.fn().mockResolvedValue({
      sendMail: vi.fn().mockRejectedValue(new Error('SMTP unavailable')),
    } satisfies EmailTransporter);
    const transport = new EmailTransport(createTransport);

    await expect(
      transport.send(
        makeNotification({
          server: 'smtp.example.com',
          username: 'mailer@example.com',
          password: 'secret',
          from: 'mediarr@example.com',
          to: 'user@example.com',
        }),
        event,
      ),
    ).rejects.toThrow('SMTP unavailable');
  });
});
