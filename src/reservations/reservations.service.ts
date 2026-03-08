import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import Mailjet from 'node-mailjet';
import { ReservationStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { BookingStatusEmail } from 'emails/booking-status-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  // ── Public: venues ──────────────────────────────────────────────────────────

  async getVenues(query: { city?: string; type?: string }) {
    const where: any = { isActive: true };
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.type) where.type = query.type;

    return this.prisma.venue.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getVenueById(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue || !venue.isActive)
      throw new NotFoundException('Venue not found');
    return venue;
  }

  // ── User: reservations ──────────────────────────────────────────────────────

  async createReservation(userId: string, dto: CreateReservationDto) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
    });
    if (!venue || !venue.isActive)
      throw new NotFoundException('Venue not found');

    return this.prisma.reservation.create({
      data: {
        venueId: dto.venueId,
        userId,
        date: new Date(dto.date),
        time: dto.time,
        partySize: dto.partySize,
        notes: dto.notes,
      },
      include: { venue: true },
    });
  }

  async getUserReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: { venue: true },
      orderBy: { date: 'desc' },
    });
  }

  async cancelReservation(id: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.userId !== userId)
      throw new ForbiddenException('Access denied');
    if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(reservation.status)) {
      throw new ForbiddenException('Cannot cancel this reservation');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });
  }

  // ── Admin: venues ───────────────────────────────────────────────────────────

  async createVenue(dto: CreateVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  async updateVenue(id: string, dto: Partial<CreateVenueDto>) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.venue.update({ where: { id }, data: dto });
  }

  async getAllVenuesAdmin() {
    return this.prisma.venue.findMany({
      include: { _count: { select: { reservations: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin: reservations ─────────────────────────────────────────────────────

  async getAdminReservations(query: {
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
          venue: { select: { name: true, type: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
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

  async confirmReservation(id: string, adminNote?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, email: true } },
        venue: { select: { name: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        adminNote: adminNote ?? null,
      },
    });
    try {
      await getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
              To: [{ Email: reservation.user.email, Name: reservation.user.firstName }],
              Subject: `Reservation Confirmed — ${reservation.venue.name}`,
              HTMLPart: BookingStatusEmail({
                recipientName: reservation.user.firstName,
                bookingNumber: reservation.id.slice(-8).toUpperCase(),
                serviceName: reservation.venue.name,
                newStatus: 'CONFIRMED',
                message: adminNote
                  ? `Great news! Your reservation at ${reservation.venue.name} has been confirmed. Note from the team: ${adminNote}`
                  : `Great news! Your reservation at ${reservation.venue.name} has been confirmed. We look forward to seeing you.`,
                ctaText: 'View My Bookings',
                ctaUrl: `${process.env.FRONTEND_URL}/dashboard/tables`,
              }),
            },
          ],
        });
    } catch {
      // Email failure should not block the response
    }
    return updated;
  }

  async rejectReservation(id: string, adminNote?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, email: true } },
        venue: { select: { name: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        adminNote: adminNote ?? null,
      },
    });
    try {
      await getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
              To: [{ Email: reservation.user.email, Name: reservation.user.firstName }],
              Subject: `Reservation Update — ${reservation.venue.name}`,
              HTMLPart: BookingStatusEmail({
                recipientName: reservation.user.firstName,
                bookingNumber: reservation.id.slice(-8).toUpperCase(),
                serviceName: reservation.venue.name,
                newStatus: 'CANCELLED',
                message: adminNote
                  ? `Unfortunately, we are unable to accommodate your reservation at ${reservation.venue.name} at this time. Note: ${adminNote}`
                  : `Unfortunately, we are unable to accommodate your reservation at ${reservation.venue.name} at this time. Please try a different date or venue.`,
              }),
            },
          ],
        });
    } catch {
      // Email failure should not block the response
    }
    return updated;
  }
}
