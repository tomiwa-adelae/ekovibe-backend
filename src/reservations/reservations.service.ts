import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import Mailjet from 'node-mailjet';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaystackService } from 'src/orders/paystack.service';
import { WalletService } from 'src/wallet/wallet.service';
import {
  ReservationStatus,
  ReservationPaymentStatus,
  VenueStatus,
  DayOfWeek,
  DepositType,
  WaitlistStatus,
} from 'generated/prisma/client';
import { InitiateReservationDto } from './dto/initiate-reservation.dto';
import { ModifyReservationDto } from './dto/modify-reservation.dto';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { BookingStatusEmail } from 'emails/booking-status-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'EKR-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
): string[] {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  // Handle sessions that cross midnight
  if (end <= start) end += 24 * 60;

  const slots: string[] = [];
  for (let t = start; t < end; t += durationMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

const JS_TO_DAY_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

async function sendEmail(
  to: { email: string; name: string },
  subject: string,
  html: string,
) {
  try {
    await getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
            To: [{ Email: to.email, Name: to.name }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });
  } catch {
    // Email failure should not block the response
  }
}

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private wallet: WalletService,
  ) {}

  // ── Public: Availability ─────────────────────────────────────────────────────

  async getAvailability(slug: string, date: string, partySize: number) {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, status: VenueStatus.LIVE, isDeleted: false },
      include: {
        spaces: { where: { isDeleted: false, isActive: true } },
        sessions: { where: { isActive: true } },
        operatingHours: true,
        blockedDates: true,
        policy: true,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');

    const bookingDate = new Date(date);
    const dayOfWeek = JS_TO_DAY_OF_WEEK[bookingDate.getDay()];

    // Check if entire venue is blocked for this date
    const venueBlocked = venue.blockedDates.some(
      (b) =>
        !b.spaceId &&
        new Date(b.date).toDateString() === bookingDate.toDateString(),
    );
    if (venueBlocked) {
      return { date, sessions: [], blocked: true };
    }

    // Check operating hours for this day
    const hours = venue.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!hours || hours.isClosed) {
      return { date, sessions: [], closed: true };
    }

    // Get sessions valid for this day
    const sessions = venue.sessions.filter((s) =>
      s.daysOfWeek.includes(dayOfWeek),
    );

    // Get all existing reservations for this date (active statuses)
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        venueId: venue.id,
        date: bookingDate,
        status: {
          in: [
            ReservationStatus.CONFIRMED,
            ReservationStatus.PENDING_APPROVAL,
            ReservationStatus.PENDING_PAYMENT,
          ],
        },
      },
      include: { spaces: true },
    });

    // Build a set of booked spaceId+timeSlot combos
    const bookedMap = new Set<string>();
    for (const res of activeReservations) {
      for (const rs of res.spaces) {
        bookedMap.add(`${rs.spaceId}:${res.timeSlot}`);
      }
    }

    // Blocked spaces for this date
    const spaceBlockedIds = new Set(
      venue.blockedDates
        .filter(
          (b) =>
            b.spaceId &&
            new Date(b.date).toDateString() === bookingDate.toDateString(),
        )
        .map((b) => b.spaceId!),
    );

    // Eligible spaces (capacity >= partySize, not blocked)
    const eligibleSpaces = venue.spaces.filter(
      (s) => s.capacity >= partySize && !spaceBlockedIds.has(s.id),
    );

    const result = sessions.map((session) => {
      const slots = generateSlots(
        session.startTime,
        session.endTime,
        session.slotDurationMinutes,
      );
      return {
        sessionId: session.id,
        sessionName: session.name,
        startTime: session.startTime,
        endTime: session.endTime,
        slots: slots.map((timeSlot) => {
          const availableSpaces = eligibleSpaces.filter(
            (s) => !bookedMap.has(`${s.id}:${timeSlot}`),
          );
          return {
            timeSlot,
            available: availableSpaces.length > 0,
            availableSpaces: availableSpaces.map((s) => ({
              id: s.id,
              name: s.name,
              type: s.type,
              capacity: s.capacity,
              minSpend: s.minSpend,
            })),
          };
        }),
      };
    });

    return {
      date,
      venue: { id: venue.id, slug: venue.slug, bookingMode: venue.bookingMode },
      sessions: result,
    };
  }

  // ── Customer: Initiate Reservation ──────────────────────────────────────────

  async initiateReservation(userId: string, dto: InitiateReservationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const venue = await this.prisma.venue.findFirst({
      where: {
        slug: dto.venueSlug,
        status: VenueStatus.LIVE,
        isDeleted: false,
      },
      include: {
        policy: true,
        owner: true,
        spaces: { where: { isDeleted: false, isActive: true } },
        blockedDates: true,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');

    const bookingDate = new Date(dto.date);

    // Check venue-level date block
    const venueBlocked = venue.blockedDates.some(
      (b) =>
        !b.spaceId &&
        new Date(b.date).toDateString() === bookingDate.toDateString(),
    );
    if (venueBlocked)
      throw new BadRequestException('Venue is not available on this date');

    // Validate requested spaces
    const requestedSpaces = venue.spaces.filter((s) =>
      dto.spaceIds.includes(s.id),
    );
    if (requestedSpaces.length !== dto.spaceIds.length) {
      throw new NotFoundException('One or more spaces not found');
    }

    // Check each requested space is available for the requested slot
    const conflicting = await this.prisma.reservation.findFirst({
      where: {
        venueId: venue.id,
        date: bookingDate,
        timeSlot: dto.timeSlot,
        status: {
          in: [
            ReservationStatus.CONFIRMED,
            ReservationStatus.PENDING_APPROVAL,
            ReservationStatus.PENDING_PAYMENT,
          ],
        },
        spaces: { some: { spaceId: { in: dto.spaceIds } } },
      },
    });
    if (conflicting)
      throw new ConflictException(
        'One or more selected spaces are already booked for this slot',
      );

    // Check space-level date blocks
    const spaceBlocked = venue.blockedDates.some(
      (b) =>
        b.spaceId &&
        dto.spaceIds.includes(b.spaceId) &&
        new Date(b.date).toDateString() === bookingDate.toDateString(),
    );
    if (spaceBlocked)
      throw new BadRequestException(
        'One or more spaces are not available on this date',
      );

    // Calculate deposit
    const policy = venue.policy;
    let depositAmount = 0;
    if (policy) {
      if (policy.depositType === DepositType.FLAT && policy.depositAmount) {
        depositAmount = policy.depositAmount;
      } else if (
        policy.depositType === DepositType.PERCENTAGE_OF_MIN_SPEND &&
        policy.depositPercent
      ) {
        const totalMinSpend = requestedSpaces.reduce(
          (sum, s) => sum + (s.minSpend ?? 0),
          0,
        );
        depositAmount = Math.round(
          (totalMinSpend * policy.depositPercent) / 100,
        );
      }
    }

    const platformFeePercent = venue.platformFeePercent;
    const platformFee = Math.round((depositAmount * platformFeePercent) / 100);
    const venuePayout = depositAmount - platformFee;

    // Generate unique reference
    let reference = generateReference();
    while (await this.prisma.reservation.findUnique({ where: { reference } })) {
      reference = generateReference();
    }

    // Determine initial status
    const needsPayment = depositAmount > 0;
    const needsApproval = venue.bookingMode === 'REQUEST';

    let initialStatus: ReservationStatus;
    if (needsPayment) {
      initialStatus = ReservationStatus.PENDING_PAYMENT;
    } else if (needsApproval) {
      initialStatus = ReservationStatus.PENDING_APPROVAL;
    } else {
      initialStatus = ReservationStatus.CONFIRMED;
    }

    // Create reservation
    const reservation = await this.prisma.reservation.create({
      data: {
        reference,
        venueId: venue.id,
        userId,
        sessionId: dto.sessionId,
        date: bookingDate,
        timeSlot: dto.timeSlot,
        partySize: dto.partySize,
        notes: dto.notes,
        specialRequests: dto.specialRequests,
        status: initialStatus,
        depositAmount,
        platformFee,
        venuePayout,
        confirmedAt:
          initialStatus === ReservationStatus.CONFIRMED
            ? new Date()
            : undefined,
        spaces: {
          create: dto.spaceIds.map((spaceId) => ({ spaceId })),
        },
      },
      include: {
        venue: { select: { name: true, bookingMode: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
        spaces: { include: { space: { select: { name: true, type: true } } } },
      },
    });

    // If no deposit needed and instant mode — send confirmation email immediately
    if (!needsPayment && !needsApproval) {
      await this.sendConfirmationEmail(reservation);
      return { reservation, message: 'Reservation confirmed' };
    }

    // If no deposit but request mode — notify venue owner
    if (!needsPayment && needsApproval) {
      await this.notifyVenueOwnerNewBooking(reservation, venue.id);
      return {
        reservation,
        message: 'Reservation submitted — awaiting venue approval',
      };
    }

    // Deposit required — initialize Paystack transaction (full amount held by platform)
    const paymentInit = await this.paystack.initializeTransactionWithSplit({
      email: user.email,
      amount: depositAmount,
      reference: `${reference}-PAY`,
      metadata: {
        reservationId: reservation.id,
        reservationReference: reference,
        type: 'reservation_deposit',
      },
      callback_url: `${process.env.FRONTEND_URL}/reservations/verify?reference=${reference}-PAY`,
    });

    // Create payment record
    await this.prisma.reservationPayment.create({
      data: {
        reservationId: reservation.id,
        paystackReference: `${reference}-PAY`,
        amount: depositAmount,
        platformFee,
        venuePayout,
        status: ReservationPaymentStatus.PENDING,
      },
    });

    return {
      reservation,
      payment: {
        authorizationUrl: paymentInit.authorization_url,
        accessCode: paymentInit.access_code,
        paystackReference: paymentInit.reference,
      },
    };
  }

  // ── Customer: Verify Reservation Payment ────────────────────────────────────

  async verifyReservationPayment(paystackReference: string) {
    const payment = await this.prisma.reservationPayment.findFirst({
      where: { paystackReference },
      include: {
        reservation: {
          include: {
            venue: { include: { owner: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
            spaces: {
              include: { space: { select: { name: true, type: true } } },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === ReservationPaymentStatus.PAID) {
      return { message: 'Already verified', reservation: payment.reservation };
    }

    const txn = await this.paystack.verifyTransaction(paystackReference);
    if (txn.status !== 'success') {
      await this.prisma.reservationPayment.update({
        where: { id: payment.id },
        data: { status: ReservationPaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment was not successful');
    }

    const reservation = payment.reservation;
    const isRequestMode = reservation.venue.bookingMode === 'REQUEST';
    const newStatus = isRequestMode
      ? ReservationStatus.PENDING_APPROVAL
      : ReservationStatus.CONFIRMED;

    const [updatedPayment, updatedReservation] = await Promise.all([
      this.prisma.reservationPayment.update({
        where: { id: payment.id },
        data: {
          status: ReservationPaymentStatus.PAID,
          paystackData: txn as any,
          paidAt: new Date(),
        },
      }),
      this.prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: newStatus,
          confirmedAt: !isRequestMode ? new Date() : undefined,
        },
      }),
    ]);

    // Credit venue owner wallet with their payout share
    if (reservation.venuePayout > 0) {
      await this.wallet.creditVenueOwnerWallet(
        reservation.venue.owner.id,
        reservation.venuePayout,
      );
    }

    if (!isRequestMode) {
      await this.sendConfirmationEmail(reservation);
    } else {
      await this.notifyVenueOwnerNewBooking(reservation, reservation.venueId);
    }

    return { reservation: updatedReservation, payment: updatedPayment };
  }

  // ── Customer: My Reservations ────────────────────────────────────────────────

  async getMyReservations(userId: string, status?: ReservationStatus) {
    return this.prisma.reservation.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: {
        venue: {
          select: { name: true, slug: true, coverImage: true, city: true },
        },
        spaces: { include: { space: { select: { name: true, type: true } } } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
    });
  }

  async getReservationById(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            name: true,
            slug: true,
            coverImage: true,
            city: true,
            address: true,
            phone: true,
          },
        },
        spaces: { include: { space: true } },
        payment: true,
        session: { select: { name: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.userId !== userId)
      throw new ForbiddenException('Access denied');
    return reservation;
  }

  // ── Customer: Modify Reservation ─────────────────────────────────────────────

  async modifyReservation(
    id: string,
    userId: string,
    dto: ModifyReservationDto,
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        venue: {
          include: {
            policy: true,
            spaces: { where: { isDeleted: false, isActive: true } },
          },
        },
        spaces: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.userId !== userId)
      throw new ForbiddenException('Access denied');

    const allowedStatuses: ReservationStatus[] = [
      ReservationStatus.CONFIRMED,
      ReservationStatus.PENDING_APPROVAL,
    ];
    if (!allowedStatuses.includes(reservation.status)) {
      throw new BadRequestException(
        'This reservation cannot be modified in its current state',
      );
    }

    const policy = reservation.venue.policy;
    const modHoursLimit = policy?.modificationAllowedHoursBefore ?? 24;
    const bookingDateTime = new Date(
      `${new Date(reservation.date).toISOString().split('T')[0]}T${reservation.timeSlot}:00`,
    );
    const hoursUntilBooking =
      (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilBooking < modHoursLimit) {
      throw new ForbiddenException(
        `Modifications must be made at least ${modHoursLimit} hours before the reservation`,
      );
    }

    // If date/time/spaces changing, re-validate availability
    const newDate = dto.date ? new Date(dto.date) : new Date(reservation.date);
    const newTimeSlot = dto.timeSlot ?? reservation.timeSlot;
    const newSpaceIds =
      dto.spaceIds ?? reservation.spaces?.map((s: any) => s.spaceId);

    if (dto.date || dto.timeSlot || dto.spaceIds) {
      const conflicting = await this.prisma.reservation.findFirst({
        where: {
          id: { not: id },
          venueId: reservation.venueId,
          date: newDate,
          timeSlot: newTimeSlot,
          status: {
            in: [
              ReservationStatus.CONFIRMED,
              ReservationStatus.PENDING_APPROVAL,
              ReservationStatus.PENDING_PAYMENT,
            ],
          },
          spaces: { some: { spaceId: { in: newSpaceIds } } },
        },
      });
      if (conflicting)
        throw new ConflictException('Selected slot is no longer available');
    }

    // Update spaces if changed
    if (dto.spaceIds) {
      await this.prisma.reservationSpace.deleteMany({
        where: { reservationId: id },
      });
      await this.prisma.reservationSpace.createMany({
        data: dto.spaceIds.map((spaceId) => ({ reservationId: id, spaceId })),
      });
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        date: dto.date ? newDate : undefined,
        timeSlot: dto.timeSlot ?? undefined,
        sessionId: dto.sessionId ?? undefined,
        partySize: dto.partySize ?? undefined,
        notes: dto.notes ?? undefined,
        specialRequests: dto.specialRequests ?? undefined,
        status: ReservationStatus.MODIFIED,
      },
      include: {
        venue: { select: { name: true } },
        user: { select: { firstName: true, email: true } },
      },
    });

    await sendEmail(
      { email: updated.user.email, name: updated.user.firstName },
      `Reservation Modified — ${updated.venue.name}`,
      BookingStatusEmail({
        recipientName: updated.user.firstName,
        bookingNumber: updated.reference,
        serviceName: updated.venue.name,
        newStatus: 'MODIFIED',
        message: `Your reservation at ${updated.venue.name} has been updated. Date: ${new Date(updated.date).toDateString()}, Time: ${updated.timeSlot}, Party: ${updated.partySize}.`,
        ctaText: 'View My Bookings',
        ctaUrl: `${process.env.FRONTEND_URL}/tables`,
      }),
    );

    return updated;
  }

  // ── Customer: Cancel Reservation ─────────────────────────────────────────────

  async cancelReservation(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        venue: { include: { policy: true } },
        payment: true,
        user: { select: { firstName: true, email: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.userId !== userId)
      throw new ForbiddenException('Access denied');

    const nonCancellableStatuses: ReservationStatus[] = [
      ReservationStatus.CANCELLED_BY_GUEST,
      ReservationStatus.CANCELLED_BY_VENUE,
      ReservationStatus.COMPLETED,
      ReservationStatus.NO_SHOW,
    ];
    if (nonCancellableStatuses.includes(reservation.status)) {
      throw new BadRequestException('This reservation cannot be cancelled');
    }

    // Calculate refund
    let refundAmount = 0;
    const policy = reservation.venue.policy;
    const payment = reservation.payment;

    if (payment && payment.status === ReservationPaymentStatus.PAID && policy) {
      const bookingDateTime = new Date(
        `${new Date(reservation.date).toISOString().split('T')[0]}T${reservation.timeSlot}:00`,
      );
      const hoursUntil =
        (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (
        policy.fullRefundHoursThreshold &&
        hoursUntil >= policy.fullRefundHoursThreshold
      ) {
        refundAmount = payment.amount;
      } else if (
        policy.partialRefundHoursThreshold &&
        policy.partialRefundPercent &&
        hoursUntil >= policy.partialRefundHoursThreshold
      ) {
        refundAmount = Math.round(
          (payment.amount * policy.partialRefundPercent) / 100,
        );
      }
      // else: no refund
    }

    // Trigger refund if applicable
    if (refundAmount > 0 && payment?.paystackReference) {
      try {
        await this.paystack.refundTransaction({
          transaction: payment.paystackReference,
          amount: refundAmount,
        });
        await this.prisma.reservationPayment.update({
          where: { id: payment.id },
          data: {
            refundedAmount: refundAmount,
            status:
              refundAmount === payment.amount
                ? ReservationPaymentStatus.REFUNDED_FULL
                : ReservationPaymentStatus.REFUNDED_PARTIAL,
            refundedAt: new Date(),
          },
        });
      } catch {
        // Refund failure is logged but does not block cancellation
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED_BY_GUEST,
        cancelledAt: new Date(),
      },
    });

    await sendEmail(
      { email: reservation.user.email, name: reservation.user.firstName },
      `Reservation Cancelled — ${reservation.venue.name}`,
      BookingStatusEmail({
        recipientName: reservation.user.firstName,
        bookingNumber: reservation.reference,
        serviceName: reservation.venue.name,
        newStatus: 'CANCELLED',
        message:
          refundAmount > 0
            ? `Your reservation has been cancelled. A refund of ₦${(refundAmount / 100).toLocaleString()} will be processed to your original payment method within 5–10 business days.`
            : `Your reservation at ${reservation.venue.name} has been cancelled. As per the venue's cancellation policy, no refund is applicable.`,
      }),
    );

    // Notify waitlist
    await this.notifyNextOnWaitlist(
      reservation.venueId,
      reservation.date,
      reservation.timeSlot,
    );

    return { reservation: updated, refundAmount };
  }

  // ── Waitlist ──────────────────────────────────────────────────────────────────

  async joinWaitlist(userId: string, dto: JoinWaitlistDto) {
    const venue = await this.prisma.venue.findFirst({
      where: {
        slug: dto.venueSlug,
        status: VenueStatus.LIVE,
        isDeleted: false,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');

    const existing = await this.prisma.reservationWaitlist.findFirst({
      where: {
        venueId: venue.id,
        userId,
        date: new Date(dto.date),
        timeSlot: dto.timeSlot,
        status: WaitlistStatus.WAITING,
      },
    });
    if (existing)
      throw new ConflictException(
        'You are already on the waitlist for this slot',
      );

    return this.prisma.reservationWaitlist.create({
      data: {
        venueId: venue.id,
        userId,
        sessionId: dto.sessionId,
        date: new Date(dto.date),
        timeSlot: dto.timeSlot,
        partySize: dto.partySize,
        status: WaitlistStatus.WAITING,
      },
    });
  }

  async leaveWaitlist(id: string, userId: string) {
    const entry = await this.prisma.reservationWaitlist.findUnique({
      where: { id },
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.reservationWaitlist.update({
      where: { id },
      data: { status: WaitlistStatus.EXPIRED },
    });
    return { message: 'Removed from waitlist' };
  }

  async getMyWaitlistEntries(userId: string) {
    return this.prisma.reservationWaitlist.findMany({
      where: { userId, status: WaitlistStatus.WAITING },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Venue Owner ───────────────────────────────────────────────────────────────

  async getVenueOwnerReservations(
    userId: string,
    query: {
      status?: ReservationStatus;
      venueSlug?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId },
    });
    if (!owner) throw new ForbiddenException('Venue owner profile required');

    const { status, venueSlug, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const venueWhere: any = { ownerId: owner.id, isDeleted: false };
    if (venueSlug) venueWhere.slug = venueSlug;
    const ownerVenues = await this.prisma.venue.findMany({
      where: venueWhere,
      select: { id: true },
    });
    const venueIds = ownerVenues.map((v) => v.id);

    const where: any = { venueId: { in: venueIds } };
    if (status) where.status = status;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: {
          venue: { select: { name: true, slug: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          spaces: {
            include: { space: { select: { name: true, type: true } } },
          },
          payment: { select: { status: true, amount: true } },
          session: { select: { name: true } },
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVenueOwnerReservationById(id: string, userId: string) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId },
    });
    if (!owner) throw new ForbiddenException('Venue owner profile required');

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImage: true,
            address: true,
            city: true,
            phone: true,
            category: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        spaces: { include: { space: { select: { name: true, type: true } } } },
        payment: true,
        session: { select: { name: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.venue.ownerId !== owner.id)
      throw new ForbiddenException('Access denied');
    return reservation;
  }

  async venueOwnerConfirmReservation(
    id: string,
    userId: string,
    venueNote?: string,
  ) {
    const reservation = await this.getReservationForVenueOwner(id, userId);
    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Only pending approval reservations can be confirmed',
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        venueNote: venueNote ?? undefined,
        confirmedAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, email: true } },
        venue: { select: { name: true } },
      },
    });

    await sendEmail(
      { email: updated.user.email, name: updated.user.firstName },
      `Reservation Confirmed — ${updated.venue.name}`,
      BookingStatusEmail({
        recipientName: updated.user.firstName,
        bookingNumber: updated.reference,
        serviceName: updated.venue.name,
        newStatus: 'CONFIRMED',
        message: venueNote
          ? `Your reservation at ${updated.venue.name} has been confirmed. Note: ${venueNote}`
          : `Great news! Your reservation at ${updated.venue.name} has been confirmed. We look forward to seeing you.`,
        ctaText: 'View My Bookings',
        ctaUrl: `${process.env.FRONTEND_URL}/tables`,
      }),
    );

    return updated;
  }

  async venueOwnerRejectReservation(
    id: string,
    userId: string,
    venueNote?: string,
  ) {
    const reservation = await this.getReservationForVenueOwner(id, userId);
    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Only pending approval reservations can be rejected',
      );
    }

    // Refund deposit if already paid
    if (
      reservation.payment?.status === ReservationPaymentStatus.PAID &&
      reservation.payment.paystackReference
    ) {
      try {
        await this.paystack.refundTransaction({
          transaction: reservation.payment.paystackReference,
        });
        await this.prisma.reservationPayment.update({
          where: { id: reservation.payment.id },
          data: {
            refundedAmount: reservation.payment.amount,
            status: ReservationPaymentStatus.REFUNDED_FULL,
            refundedAt: new Date(),
          },
        });
      } catch {
        // Refund failure is logged
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        venueNote: venueNote ?? undefined,
        cancelledAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, email: true } },
        venue: { select: { name: true } },
      },
    });

    await sendEmail(
      { email: updated.user.email, name: updated.user.firstName },
      `Reservation Update — ${updated.venue.name}`,
      BookingStatusEmail({
        recipientName: updated.user.firstName,
        bookingNumber: updated.reference,
        serviceName: updated.venue.name,
        newStatus: 'CANCELLED',
        message: venueNote
          ? `We're unable to accommodate your reservation at ${updated.venue.name}. Note: ${venueNote}. Any deposit paid will be fully refunded.`
          : `We're unable to accommodate your reservation at ${updated.venue.name} at this time. Any deposit paid will be fully refunded. Please try a different date.`,
      }),
    );

    return updated;
  }

  async venueOwnerMarkCompleted(id: string, userId: string) {
    const reservation = await this.getReservationForVenueOwner(id, userId);
    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async venueOwnerMarkNoShow(id: string, userId: string) {
    const reservation = await this.getReservationForVenueOwner(id, userId);
    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.NO_SHOW },
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async getAllReservationsAdmin(query: {
    status?: ReservationStatus;
    venueId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, venueId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (venueId) where.venueId = venueId;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: {
          venue: { select: { name: true, slug: true, category: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          spaces: {
            include: { space: { select: { name: true, type: true } } },
          },
          payment: true,
          session: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminOverrideConfirm(id: string, adminNote?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        adminNote: adminNote ?? undefined,
        confirmedAt: new Date(),
      },
    });
  }

  async adminOverrideCancel(id: string, adminNote?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    // Full refund if paid
    if (
      reservation.payment?.status === ReservationPaymentStatus.PAID &&
      reservation.payment.paystackReference
    ) {
      try {
        await this.paystack.refundTransaction({
          transaction: reservation.payment.paystackReference,
        });
        await this.prisma.reservationPayment.update({
          where: { id: reservation.payment.id },
          data: {
            refundedAmount: reservation.payment.amount,
            status: ReservationPaymentStatus.REFUNDED_FULL,
            refundedAt: new Date(),
          },
        });
      } catch {
        // Logged
      }
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED_BY_VENUE,
        adminNote: adminNote ?? undefined,
        cancelledAt: new Date(),
      },
    });
  }

  async adminNotifyWaitlist(waitlistId: string) {
    const entry = await this.prisma.reservationWaitlist.findUnique({
      where: { id: waitlistId },
      include: { user: { select: { firstName: true, email: true } } },
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    const claimExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours to claim

    await this.prisma.reservationWaitlist.update({
      where: { id: waitlistId },
      data: {
        status: WaitlistStatus.NOTIFIED,
        notifiedAt: new Date(),
        claimExpiresAt,
      },
    });

    await sendEmail(
      { email: entry.user.email, name: entry.user.firstName },
      'A spot just opened up!',
      BookingStatusEmail({
        recipientName: entry.user.firstName,
        bookingNumber: '',
        serviceName: 'Your waitlisted venue',
        newStatus: 'CONFIRMED',
        message: `Good news! A spot has opened up for your waitlisted booking. Click below to claim it — this link expires in 2 hours.`,
        ctaText: 'Claim Your Spot',
        ctaUrl: `${process.env.FRONTEND_URL}/reservations/claim?waitlist=${waitlistId}`,
      }),
    );

    return { message: 'Waitlist entry notified' };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────────

  private async getReservationForVenueOwner(id: string, userId: string) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId },
    });
    if (!owner) throw new ForbiddenException('Venue owner profile required');

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        venue: { select: { name: true, ownerId: true } },
        payment: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.venue.ownerId !== owner.id)
      throw new ForbiddenException('Access denied');
    return reservation;
  }

  private async sendConfirmationEmail(reservation: any) {
    await sendEmail(
      { email: reservation.user.email, name: reservation.user.firstName },
      `Booking Confirmed — ${reservation.venue.name}`,
      BookingStatusEmail({
        recipientName: reservation.user.firstName,
        bookingNumber: reservation.reference,
        serviceName: reservation.venue.name,
        newStatus: 'CONFIRMED',
        message: `Your reservation at ${reservation.venue.name} is confirmed. Date: ${new Date(reservation.date).toDateString()}, Time: ${reservation.timeSlot}, Party of ${reservation.partySize}.`,
        ctaText: 'View My Bookings',
        ctaUrl: `${process.env.FRONTEND_URL}/tables`,
      }),
    );
  }

  private async notifyVenueOwnerNewBooking(reservation: any, venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        owner: {
          include: { user: { select: { firstName: true, email: true } } },
        },
      },
    });
    if (!venue?.owner?.user?.email) return;

    await sendEmail(
      { email: venue.owner.user.email, name: venue.owner.user.firstName },
      `New Reservation Request — ${venue.name}`,
      BookingStatusEmail({
        recipientName: venue.owner.user.firstName,
        bookingNumber: reservation.reference,
        serviceName: venue.name,
        newStatus: 'PENDING',
        message: `You have a new reservation request for ${venue.name}. Date: ${new Date(reservation.date).toDateString()}, Time: ${reservation.timeSlot}, Party of ${reservation.partySize}. Please review and respond.`,
        ctaText: 'View Reservation',
        ctaUrl: `${process.env.FRONTEND_URL}/venue-dashboard/reservations/${reservation.id}`,
      }),
    );
  }

  private async notifyNextOnWaitlist(
    venueId: string,
    date: Date,
    timeSlot: string,
  ) {
    const next = await this.prisma.reservationWaitlist.findFirst({
      where: { venueId, date, timeSlot, status: WaitlistStatus.WAITING },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { firstName: true, email: true } } },
    });
    if (!next) return;

    const claimExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await this.prisma.reservationWaitlist.update({
      where: { id: next.id },
      data: {
        status: WaitlistStatus.NOTIFIED,
        notifiedAt: new Date(),
        claimExpiresAt,
      },
    });

    await sendEmail(
      { email: next.user.email, name: next.user.firstName },
      'A spot just opened up!',
      BookingStatusEmail({
        recipientName: next.user.firstName,
        bookingNumber: '',
        serviceName: 'Your waitlisted venue',
        newStatus: 'CONFIRMED',
        message: `Great news! A spot has opened up for your waitlisted booking on ${new Date(date).toDateString()} at ${timeSlot}. Click below to claim it — this link expires in 2 hours.`,
        ctaText: 'Claim Your Spot',
        ctaUrl: `${process.env.FRONTEND_URL}/reservations/claim?waitlist=${next.id}`,
      }),
    );
  }
}
