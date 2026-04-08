import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Mailjet from 'node-mailjet';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { NewsletterConfirmationEmail } from 'emails/newsletter-confirmation-email';
import { NewsletterWelcomeEmail } from 'emails/newsletter-welcome-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async subscribe(dto: SubscribeDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe: reset unsubscribed state, issue new confirmation token
        await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            unsubscribedAt: null,
            confirmed: false,
            confirmedAt: null,
            confirmationToken: crypto.randomUUID(),
            subscribedAt: new Date(),
          },
        });
        const updated = await this.prisma.newsletterSubscriber.findUnique({
          where: { email },
        });
        await this.sendConfirmationEmail(email, updated!.confirmationToken);
        return { message: 'Check your inbox to confirm your subscription.' };
      }

      if (existing.confirmed) {
        throw new ConflictException('This email is already subscribed.');
      }

      // Pending confirmation — resend
      await this.sendConfirmationEmail(email, existing.confirmationToken);
      return { message: 'Check your inbox to confirm your subscription.' };
    }

    const subscriber = await this.prisma.newsletterSubscriber.create({
      data: { email },
    });

    await this.sendConfirmationEmail(email, subscriber.confirmationToken);
    return { message: 'Check your inbox to confirm your subscription.' };
  }

  async confirm(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { confirmationToken: token },
    });

    if (!subscriber) throw new NotFoundException('Invalid or expired link.');
    if (subscriber.unsubscribedAt)
      throw new BadRequestException('This subscription has been cancelled.');
    if (subscriber.confirmed) {
      return { message: 'Already confirmed.', alreadyConfirmed: true };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmed: true, confirmedAt: new Date() },
    });

    // Send welcome email (non-blocking)
    const unsubscribeUrl = `${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;
    const mj = getMailjet();
    mj.post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
            To: [{ Email: subscriber.email }],
            Subject: "You're in — The Vibe List 🎉",
            HTMLPart: NewsletterWelcomeEmail({ unsubscribeUrl }),
          },
        ],
      })
      .catch(() => {});

    return { message: 'Subscription confirmed! Welcome to The Vibe List.' };
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) throw new NotFoundException('Invalid unsubscribe link.');
    if (subscriber.unsubscribedAt) {
      return { message: 'Already unsubscribed.' };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { unsubscribedAt: new Date() },
    });

    return { message: 'You have been unsubscribed.' };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getSubscribers(query: {
    page?: number;
    limit?: number;
    filter?: 'confirmed' | 'pending' | 'unsubscribed' | 'all';
  }) {
    const { page = 1, limit = 50, filter = 'all' } = query;
    const skip = (page - 1) * limit;

    const where =
      filter === 'confirmed'
        ? { confirmed: true, unsubscribedAt: null }
        : filter === 'pending'
          ? { confirmed: false, unsubscribedAt: null }
          : filter === 'unsubscribed'
            ? { unsubscribedAt: { not: null } }
            : {};

    const [subscribers, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          confirmed: true,
          subscribedAt: true,
          confirmedAt: true,
          unsubscribedAt: true,
        },
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    const [totalConfirmed, totalPending, totalUnsubscribed] = await Promise.all(
      [
        this.prisma.newsletterSubscriber.count({
          where: { confirmed: true, unsubscribedAt: null },
        }),
        this.prisma.newsletterSubscriber.count({
          where: { confirmed: false, unsubscribedAt: null },
        }),
        this.prisma.newsletterSubscriber.count({
          where: { unsubscribedAt: { not: null } },
        }),
      ],
    );

    return {
      data: subscribers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: { totalConfirmed, totalPending, totalUnsubscribed },
      },
    };
  }

  async deleteSubscriber(id: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!subscriber) throw new NotFoundException('Subscriber not found.');
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
    return { message: 'Subscriber removed.' };
  }

  async exportCsv() {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { confirmed: true, unsubscribedAt: null },
      orderBy: { confirmedAt: 'desc' },
      select: { email: true, confirmedAt: true },
    });

    const rows = [
      'Email,Confirmed At',
      ...subscribers.map(
        (s) =>
          `${s.email},${s.confirmedAt ? new Date(s.confirmedAt).toISOString() : ''}`,
      ),
    ];

    return rows.join('\n');
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async sendConfirmationEmail(email: string, token: string) {
    const confirmUrl = `${process.env.FRONTEND_URL}/newsletter/confirm?token=${token}`;
    const mj = getMailjet();
    await mj.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
          To: [{ Email: email }],
          Subject: 'Confirm your subscription to The Vibe List',
          HTMLPart: NewsletterConfirmationEmail({ confirmUrl }),
        },
      ],
    });
  }
}
