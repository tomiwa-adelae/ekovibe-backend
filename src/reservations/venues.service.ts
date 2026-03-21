import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaystackService } from 'src/orders/paystack.service';
import { VenueStatus, VenueCategory } from 'generated/prisma/client';
import { OnboardVenueOwnerDto } from './dto/onboard-venue-owner.dto';
import { ApplyVenueDto, UpdateVenueDto } from './dto/apply-venue.dto';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/create-space.dto';
import { SetOperatingHoursDto } from './dto/set-operating-hours.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/create-session.dto';
import { BlockDateDto } from './dto/block-date.dto';
import { SetPolicyDto } from './dto/set-policy.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateSlug(base: string, suffix = ''): string {
  const s = slugify(base);
  return suffix ? `${s}-${suffix}` : s;
}

@Injectable()
export class VenuesService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
  ) {}

  // ── Venue Owner Onboarding ───────────────────────────────────────────────────

  async onboardVenueOwner(userId: string, dto: OnboardVenueOwnerDto) {
    const existing = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new ConflictException('You already have a venue owner profile');

    // Create Paystack subaccount — platform keeps its fee via transaction_charge per booking
    let paystackSubaccountCode: string | null = null;
    try {
      const subaccount = await this.paystack.createSubaccount({
        business_name: dto.businessName,
        bank_code: dto.bankCode,
        account_number: dto.accountNumber,
        percentage_charge: 90, // default: 90% to venue, 10% to platform — overridden per-transaction
      });
      paystackSubaccountCode = subaccount.subaccount_code;
    } catch {
      // Subaccount creation failing should not block onboarding entirely; it can be retried
      paystackSubaccountCode = null;
    }

    return this.prisma.venueOwnerProfile.create({
      data: {
        userId,
        businessName: dto.businessName,
        businessEmail: dto.businessEmail,
        businessPhone: dto.businessPhone,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        paystackSubaccountCode,
        isVerified: !!paystackSubaccountCode,
      },
    });
  }

  async getMyOwnerProfile(userId: string) {
    const profile = await this.prisma.venueOwnerProfile.findUnique({
      where: { userId },
      include: { venues: { select: { id: true, name: true, slug: true, status: true } } },
    });
    if (!profile) throw new NotFoundException('Venue owner profile not found');
    return profile;
  }

  async updateMyOwnerProfile(userId: string, dto: Partial<OnboardVenueOwnerDto>) {
    const profile = await this.prisma.venueOwnerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Venue owner profile not found');
    return this.prisma.venueOwnerProfile.update({
      where: { userId },
      data: {
        businessName: dto.businessName ?? undefined,
        businessEmail: dto.businessEmail ?? undefined,
        businessPhone: dto.businessPhone ?? undefined,
      },
    });
  }

  // ── Venue Application ────────────────────────────────────────────────────────

  async applyVenue(userId: string, dto: ApplyVenueDto) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({ where: { userId } });
    if (!owner) throw new ForbiddenException('Complete venue owner onboarding first');

    // Generate unique slug
    let slug = generateSlug(dto.name);
    const exists = await this.prisma.venue.findUnique({ where: { slug } });
    if (exists) slug = generateSlug(dto.name, Date.now().toString().slice(-4));

    return this.prisma.venue.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        bookingMode: dto.bookingMode ?? 'INSTANT',
        ownerId: owner.id,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'Nigeria',
        coverImage: dto.coverImage,
        images: dto.images ?? [],
        phone: dto.phone,
        email: dto.email,
        instagram: dto.instagram,
        website: dto.website,
      },
    });
  }

  async getMyVenues(userId: string) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({ where: { userId } });
    if (!owner) throw new NotFoundException('Venue owner profile not found');
    return this.prisma.venue.findMany({
      where: { ownerId: owner.id, isDeleted: false },
      include: {
        _count: { select: { spaces: true, reservations: true } },
        policy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyVenueBySlug(slug: string, userId: string) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({ where: { userId } });
    if (!owner) throw new NotFoundException('Venue owner profile not found');
    const venue = await this.prisma.venue.findFirst({
      where: { slug, ownerId: owner.id, isDeleted: false },
      include: {
        spaces: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' } },
        operatingHours: true,
        sessions: { where: { isActive: true } },
        blockedDates: { orderBy: { date: 'asc' } },
        policy: true,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  async updateVenue(slug: string, userId: string, dto: UpdateVenueDto) {
    const venue = await this.getOwnedVenue(slug, userId);

    let newSlug = venue.slug;
    if (dto.name && dto.name !== venue.name) {
      newSlug = generateSlug(dto.name);
      const conflict = await this.prisma.venue.findFirst({
        where: { slug: newSlug, id: { not: venue.id } },
      });
      if (conflict) newSlug = generateSlug(dto.name, Date.now().toString().slice(-4));
    }

    return this.prisma.venue.update({
      where: { id: venue.id },
      data: {
        slug: newSlug,
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        category: dto.category ?? undefined,
        bookingMode: dto.bookingMode ?? undefined,
        address: dto.address ?? undefined,
        city: dto.city ?? undefined,
        state: dto.state ?? undefined,
        coverImage: dto.coverImage ?? undefined,
        images: dto.images ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        instagram: dto.instagram ?? undefined,
        website: dto.website ?? undefined,
      },
    });
  }

  // ── Spaces ───────────────────────────────────────────────────────────────────

  async addSpace(slug: string, userId: string, dto: CreateSpaceDto) {
    const venue = await this.getOwnedVenue(slug, userId);
    return this.prisma.venueSpace.create({
      data: {
        venueId: venue.id,
        name: dto.name,
        type: dto.type,
        capacity: dto.capacity,
        description: dto.description,
        minSpend: dto.minSpend,
        images: dto.images ?? [],
      },
    });
  }

  async updateSpace(slug: string, spaceId: string, userId: string, dto: UpdateSpaceDto) {
    const venue = await this.getOwnedVenue(slug, userId);
    const space = await this.prisma.venueSpace.findFirst({
      where: { id: spaceId, venueId: venue.id, isDeleted: false },
    });
    if (!space) throw new NotFoundException('Space not found');
    return this.prisma.venueSpace.update({
      where: { id: spaceId },
      data: {
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        capacity: dto.capacity ?? undefined,
        description: dto.description ?? undefined,
        minSpend: dto.minSpend ?? undefined,
        images: dto.images ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async removeSpace(slug: string, spaceId: string, userId: string) {
    const venue = await this.getOwnedVenue(slug, userId);
    const space = await this.prisma.venueSpace.findFirst({
      where: { id: spaceId, venueId: venue.id, isDeleted: false },
    });
    if (!space) throw new NotFoundException('Space not found');
    await this.prisma.venueSpace.update({
      where: { id: spaceId },
      data: { isDeleted: true, isActive: false },
    });
    return { message: 'Space removed' };
  }

  // ── Operating Hours ──────────────────────────────────────────────────────────

  async setOperatingHours(slug: string, userId: string, dto: SetOperatingHoursDto) {
    const venue = await this.getOwnedVenue(slug, userId);

    await Promise.all(
      dto.hours.map((h) =>
        this.prisma.venueOperatingHours.upsert({
          where: { venueId_dayOfWeek: { venueId: venue.id, dayOfWeek: h.dayOfWeek } },
          update: {
            isClosed: h.isClosed,
            openTime: h.openTime ?? '',
            closeTime: h.closeTime ?? '',
          },
          create: {
            venueId: venue.id,
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: h.openTime ?? '',
            closeTime: h.closeTime ?? '',
          },
        }),
      ),
    );

    return this.prisma.venueOperatingHours.findMany({ where: { venueId: venue.id } });
  }

  // ── Sessions ─────────────────────────────────────────────────────────────────

  async addSession(slug: string, userId: string, dto: CreateSessionDto) {
    const venue = await this.getOwnedVenue(slug, userId);
    return this.prisma.venueSession.create({
      data: {
        venueId: venue.id,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDurationMinutes: dto.slotDurationMinutes ?? 60,
        daysOfWeek: dto.daysOfWeek,
      },
    });
  }

  async updateSession(slug: string, sessionId: string, userId: string, dto: UpdateSessionDto) {
    const venue = await this.getOwnedVenue(slug, userId);
    const session = await this.prisma.venueSession.findFirst({
      where: { id: sessionId, venueId: venue.id },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.venueSession.update({
      where: { id: sessionId },
      data: {
        name: dto.name ?? undefined,
        startTime: dto.startTime ?? undefined,
        endTime: dto.endTime ?? undefined,
        slotDurationMinutes: dto.slotDurationMinutes ?? undefined,
        daysOfWeek: dto.daysOfWeek ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async removeSession(slug: string, sessionId: string, userId: string) {
    const venue = await this.getOwnedVenue(slug, userId);
    const session = await this.prisma.venueSession.findFirst({
      where: { id: sessionId, venueId: venue.id },
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.venueSession.delete({ where: { id: sessionId } });
    return { message: 'Session removed' };
  }

  // ── Blocked Dates ─────────────────────────────────────────────────────────────

  async blockDate(slug: string, userId: string, dto: BlockDateDto) {
    const venue = await this.getOwnedVenue(slug, userId);

    if (dto.spaceId) {
      const space = await this.prisma.venueSpace.findFirst({
        where: { id: dto.spaceId, venueId: venue.id, isDeleted: false },
      });
      if (!space) throw new NotFoundException('Space not found');
    }

    return this.prisma.venueBlockedDate.create({
      data: {
        venueId: venue.id,
        spaceId: dto.spaceId ?? null,
        date: new Date(dto.date),
        reason: dto.reason,
      },
    });
  }

  async unblockDate(slug: string, blockId: string, userId: string) {
    const venue = await this.getOwnedVenue(slug, userId);
    const block = await this.prisma.venueBlockedDate.findFirst({
      where: { id: blockId, venueId: venue.id },
    });
    if (!block) throw new NotFoundException('Blocked date not found');
    await this.prisma.venueBlockedDate.delete({ where: { id: blockId } });
    return { message: 'Date unblocked' };
  }

  // ── Policy ────────────────────────────────────────────────────────────────────

  async setPolicy(slug: string, userId: string, dto: SetPolicyDto) {
    const venue = await this.getOwnedVenue(slug, userId);
    return this.prisma.reservationPolicy.upsert({
      where: { venueId: venue.id },
      update: {
        depositType: dto.depositType,
        depositAmount: dto.depositAmount ?? null,
        depositPercent: dto.depositPercent ?? null,
        fullRefundHoursThreshold: dto.fullRefundHoursThreshold ?? null,
        partialRefundHoursThreshold: dto.partialRefundHoursThreshold ?? null,
        partialRefundPercent: dto.partialRefundPercent ?? null,
        modificationAllowedHoursBefore: dto.modificationAllowedHoursBefore ?? 24,
      },
      create: {
        venueId: venue.id,
        depositType: dto.depositType,
        depositAmount: dto.depositAmount ?? null,
        depositPercent: dto.depositPercent ?? null,
        fullRefundHoursThreshold: dto.fullRefundHoursThreshold ?? null,
        partialRefundHoursThreshold: dto.partialRefundHoursThreshold ?? null,
        partialRefundPercent: dto.partialRefundPercent ?? null,
        modificationAllowedHoursBefore: dto.modificationAllowedHoursBefore ?? 24,
      },
    });
  }

  // ── Public ────────────────────────────────────────────────────────────────────

  async getVenues(query: {
    city?: string;
    category?: VenueCategory;
    page?: number;
    limit?: number;
  }) {
    const { city, category, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: VenueStatus.LIVE, isDeleted: false };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (category) where.category = category;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        select: {
          id: true, slug: true, name: true, category: true, city: true,
          state: true, coverImage: true, images: true, phone: true,
          bookingMode: true, instagram: true, website: true,
          _count: { select: { spaces: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { data: venues, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getVenueBySlug(slug: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, status: VenueStatus.LIVE, isDeleted: false },
      include: {
        spaces: {
          where: { isDeleted: false, isActive: true },
          select: {
            id: true, name: true, type: true, capacity: true,
            description: true, minSpend: true, images: true,
          },
          orderBy: { name: 'asc' },
        },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        sessions: {
          where: { isActive: true },
          orderBy: { startTime: 'asc' },
        },
        policy: true,
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async getAllVenuesAdmin(query: {
    status?: VenueStatus;
    category?: VenueCategory;
    page?: number;
    limit?: number;
  }) {
    const { status, category, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (category) where.category = category;

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: {
          owner: {
            select: {
              businessName: true, businessEmail: true, isVerified: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          _count: { select: { reservations: true, spaces: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { data: venues, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getVenueByIdAdmin(id: string) {
    const [venue, aggregate, statusGroups, recentReservations] = await Promise.all([
      this.prisma.venue.findUnique({
        where: { id },
        include: {
          owner: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
          spaces: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' } },
          operatingHours: { orderBy: { dayOfWeek: 'asc' } },
          sessions: { orderBy: { startTime: 'asc' } },
          blockedDates: { orderBy: { date: 'asc' } },
          policy: true,
        },
      }),
      this.prisma.reservation.aggregate({
        where: { venueId: id },
        _count: { id: true },
        _sum: { depositAmount: true, platformFee: true, venuePayout: true },
      }),
      this.prisma.reservation.groupBy({
        by: ['status'],
        where: { venueId: id },
        _count: { id: true },
      }),
      this.prisma.reservation.findMany({
        where: { venueId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          reference: true,
          date: true,
          timeSlot: true,
          partySize: true,
          status: true,
          depositAmount: true,
          platformFee: true,
          venuePayout: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          session: { select: { name: true } },
          spaces: { select: { space: { select: { name: true } } } },
        },
      }),
    ]);

    if (!venue) throw new NotFoundException('Venue not found');

    const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count.id]));

    return {
      ...venue,
      stats: {
        totalReservations: aggregate._count.id,
        totalDeposits: aggregate._sum.depositAmount ?? 0,
        totalPlatformFee: aggregate._sum.platformFee ?? 0,
        totalVenuePayout: aggregate._sum.venuePayout ?? 0,
        byStatus,
      },
      recentReservations,
    };
  }

  async approveVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.LIVE, rejectionReason: null },
    });
  }

  async rejectVenue(id: string, reason: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.REJECTED, rejectionReason: reason },
    });
  }

  async suspendVenue(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.SUSPENDED },
    });
  }

  async updatePlatformFee(id: string, platformFeePercent: number) {
    if (platformFeePercent < 0 || platformFeePercent > 100) {
      throw new BadRequestException('Platform fee must be between 0 and 100');
    }
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.venue.update({ where: { id }, data: { platformFeePercent } });
  }

  async updateVenueImages(slug: string, userId: string, images: string[]) {
    const venue = await this.getOwnedVenue(slug, userId);
    return this.prisma.venue.update({
      where: { id: venue.id },
      data: { images },
      select: { id: true, images: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async getOwnedVenue(slug: string, userId: string) {
    const owner = await this.prisma.venueOwnerProfile.findUnique({ where: { userId } });
    if (!owner) throw new ForbiddenException('Venue owner profile required');
    const venue = await this.prisma.venue.findFirst({
      where: { slug, ownerId: owner.id, isDeleted: false },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }
}
