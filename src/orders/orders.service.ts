import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Mailjet from 'node-mailjet';
import { EventStatus, OrderStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { InitiateOrderDto } from './dto/initiate-order.dto';
import { VerifyOrderDto } from './dto/verify-order.dto';
import { BookingConfirmationEmail } from 'emails/booking-confirmation-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

const SERVICE_FEE_PER_TICKET = 250000; // ₦2,500 in kobo

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
  ) {}

  async initiateOrder(
    userId: string,
    dto: InitiateOrderDto,
    userEmail: string,
  ) {
    const quantity = dto.quantity ?? 1;

    // Validate event exists and is live
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.LIVE) {
      throw new BadRequestException('This event is not currently available');
    }

    // Validate ticket tier and availability
    const tier = await this.prisma.ticketTier.findUnique({
      where: { id: dto.tierId },
    });
    if (!tier || tier.eventId !== dto.eventId) {
      throw new NotFoundException('Ticket tier not found');
    }
    const available = tier.quantity - tier.sold;
    if (available < quantity) {
      throw new BadRequestException(
        `Only ${available} ticket(s) remaining for this tier`,
      );
    }

    // Calculate pricing (all in kobo)
    const subtotal = tier.price * quantity;
    const serviceFee = SERVICE_FEE_PER_TICKET * quantity;
    const total = subtotal + serviceFee;

    // Generate unique order reference
    const reference = `EKV-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;

    // Create pending order + order item
    const order = await this.prisma.order.create({
      data: {
        reference,
        userId,
        eventId: dto.eventId,
        status: OrderStatus.PENDING,
        subtotal,
        serviceFee,
        total,
        items: {
          create: {
            ticketTierId: dto.tierId,
            quantity,
            unitPrice: tier.price,
          },
        },
      },
      include: { items: true },
    });

    // Initialize Paystack transaction
    const paystack = await this.paystack.initializeTransaction({
      email: userEmail,
      amount: total,
      reference,
      metadata: {
        orderId: order.id,
        eventId: dto.eventId,
        tierId: dto.tierId,
        quantity,
        userId,
      },
    });

    return {
      orderId: order.id,
      reference,
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      total,
      subtotal,
      serviceFee,
    };
  }

  async verifyAndFulfillOrder(dto: VerifyOrderDto, userId: string) {
    // Find the pending order
    const order = await this.prisma.order.findUnique({
      where: { reference: dto.reference },
      include: {
        items: { include: { ticketTier: true } },
        event: true,
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    // Already fulfilled
    if (order.status === OrderStatus.PAID) {
      const tickets = await this.prisma.ticket.findMany({
        where: { orderId: order.id },
        include: { orderItem: { include: { ticketTier: true } } },
      });
      return { order, tickets };
    }

    // Verify with Paystack
    const paystackData = await this.paystack.verifyTransaction(dto.reference);

    if (paystackData.status !== 'success') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED, paystackData: paystackData as any },
      });
      throw new BadRequestException('Payment was not successful');
    }

    // Confirm amount matches (Paystack returns amount in kobo)
    if (paystackData.amount !== order.total) {
      throw new BadRequestException('Payment amount mismatch');
    }

    // Issue tickets (one per quantity per tier)
    const ticketData: {
      code: string;
      orderId: string;
      orderItemId: string;
      userId: string;
    }[] = [];
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        ticketData.push({
          code: uuidv4(),
          orderId: order.id,
          orderItemId: item.id,
          userId,
        });
      }
    }

    // Fulfill in a transaction: update order, increment sold, create tickets
    const [updatedOrder, , tickets] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paystackReference: paystackData.reference,
          paystackData: paystackData as any,
        },
      }),
      // Increment sold count for each tier
      ...order.items.map((item) =>
        this.prisma.ticketTier.update({
          where: { id: item.ticketTierId },
          data: { sold: { increment: item.quantity } },
        }),
      ),
      this.prisma.ticket.createMany({ data: ticketData }),
    ]);

    // Check if event is now sold out
    await this.checkAndUpdateSoldOutStatus(order.eventId);

    // Fetch created tickets
    const createdTickets = await this.prisma.ticket.findMany({
      where: { orderId: order.id },
      include: {
        orderItem: { include: { ticketTier: true } },
      },
    });

    // Send confirmation email
    try {
      await getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: process.env.SENDER_EMAIL_ADDRESS,
                Name: 'Ekovibe',
              },
              To: [{ Email: order.user.email, Name: order.user.firstName }],
              Subject: `Your Tickets: ${order.event.title}`,
              HTMLPart: BookingConfirmationEmail({
                firstName: order.user.firstName,
                eventTitle: order.event.title,
                eventDate: order.event.date.toLocaleDateString('en-NG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                venueName: order.event.venueName,
                orderReference: order.reference,
                tickets: createdTickets.map((t) => ({
                  code: t.code,
                  tierName: t.orderItem.ticketTier.name,
                })),
              }),
            },
          ],
        });
    } catch (e) {
      // Email failure should not block ticket delivery
      console.error('Failed to send booking email:', e);
    }

    return { order: updatedOrder, tickets: createdTickets };
  }

  private async checkAndUpdateSoldOutStatus(eventId: string) {
    const tiers = await this.prisma.ticketTier.findMany({
      where: { eventId },
    });
    const allSoldOut = tiers.every((t) => t.sold >= t.quantity);
    if (allSoldOut) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.SOLD_OUT },
      });
    }
  }

  async getUserTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        order: {
          include: {
            event: {
              select: {
                title: true,
                slug: true,
                date: true,
                doorsOpen: true,
                venueName: true,
                venueAddress: true,
                coverImage: true,
                category: true,
              },
            },
          },
        },
        orderItem: {
          include: { ticketTier: { select: { name: true, price: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketByCode(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        order: { include: { event: true } },
        orderItem: { include: { ticketTier: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async scanTicket(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: {
        user: { select: { firstName: true, lastName: true } },
        order: { include: { event: { select: { title: true } } } },
        orderItem: { include: { ticketTier: { select: { name: true } } } },
      },
    });

    if (!ticket) throw new NotFoundException('Invalid ticket code');
    if (ticket.isUsed) {
      return {
        valid: false,
        reason: 'ALREADY_USED',
        usedAt: ticket.usedAt,
        holder: `${ticket.user.firstName} ${ticket.user.lastName}`,
        tier: ticket.orderItem.ticketTier.name,
        event: ticket.order.event.title,
      };
    }

    // Mark as used
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    return {
      valid: true,
      holder: `${ticket.user.firstName} ${ticket.user.lastName}`,
      tier: ticket.orderItem.ticketTier.name,
      event: ticket.order.event.title,
    };
  }

  async getAdminOrders(query: {
    page?: number;
    limit?: number;
    eventId?: string;
  }) {
    const { page = 1, limit = 20, eventId } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: OrderStatus.PAID };
    if (eventId) where.eventId = eventId;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          event: { select: { title: true, date: true } },
          items: { include: { ticketTier: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
