import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import slugify from 'slugify';
import { EventStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto, UpdateEventStatusDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.event.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  async create(dto: CreateEventDto, adminUserId: string) {
    const slug = await this.generateUniqueSlug(dto.title);

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        category: dto.category,
        coverImage: dto.coverImage,
        date: new Date(dto.date),
        doorsOpen: dto.doorsOpen,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        city: dto.city,
        dressCode: dto.dressCode,
        isMemberOnly: dto.isMemberOnly ?? false,
        createdById: adminUserId,
        ticketTiers: {
          create: dto.ticketTiers.map((tier) => ({
            name: tier.name,
            description: tier.description,
            price: tier.price,
            quantity: tier.quantity,
          })),
        },
      },
      include: { ticketTiers: true },
    });

    return event;
  }

  // Admin: all events, any status
  async findAllAdmin(query: EventQueryDto) {
    const { search, category, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          ticketTiers: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    // Attach computed stats
    const eventsWithStats = events.map((e) => {
      const totalCapacity = e.ticketTiers.reduce((s, t) => s + t.quantity, 0);
      const totalSold = e.ticketTiers.reduce((s, t) => s + t.sold, 0);
      const totalRevenue = e.ticketTiers.reduce(
        (s, t) => s + t.sold * t.price,
        0,
      );
      return { ...e, totalCapacity, totalSold, totalRevenue };
    });

    return {
      data: eventsWithStats,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Public: only LIVE events
  async findPublished(query: EventQueryDto) {
    const { search, category, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: EventStatus.LIVE };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: { ticketTiers: true },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { ticketTiers: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        ticketTiers: true,
        orders: {
          where: { status: 'PAID' },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            items: { include: { ticketTier: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { orders: true } },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    const totalCapacity = event.ticketTiers.reduce((s, t) => s + t.quantity, 0);
    const totalSold = event.ticketTiers.reduce((s, t) => s + t.sold, 0);
    const totalRevenue = event.ticketTiers.reduce(
      (s, t) => s + t.sold * t.price,
      0,
    );

    return { ...event, totalCapacity, totalSold, totalRevenue };
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');

    let slug = existing.slug;
    if (dto.title && dto.title !== existing.title) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    // If ticketTiers are provided, replace them
    const updateData: any = {
      ...(dto.title && { title: dto.title, slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category && { category: dto.category }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
      ...(dto.date && { date: new Date(dto.date) }),
      ...(dto.doorsOpen && { doorsOpen: dto.doorsOpen }),
      ...(dto.venueName && { venueName: dto.venueName }),
      ...(dto.venueAddress !== undefined && { venueAddress: dto.venueAddress }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.dressCode !== undefined && { dressCode: dto.dressCode }),
      ...(dto.isMemberOnly !== undefined && { isMemberOnly: dto.isMemberOnly }),
    };

    if (dto.ticketTiers) {
      // Fetch existing tiers so we know which have sold tickets
      const existingTiers = await this.prisma.ticketTier.findMany({
        where: { eventId: id },
        select: { id: true, sold: true },
      });

      const submittedIdSet = new Set(
        dto.ticketTiers.filter((t) => t.id).map((t) => t.id),
      );

      // Delete only tiers not in the submitted list that have no sold tickets
      const toDelete = existingTiers
        .filter((t) => !submittedIdSet.has(t.id) && t.sold === 0)
        .map((t) => t.id);

      if (toDelete.length > 0) {
        await this.prisma.ticketTier.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Upsert each submitted tier
      for (const tier of dto.ticketTiers) {
        if (tier.id) {
          // Update existing tier; don't allow quantity to drop below sold count
          const existing = existingTiers.find((t) => t.id === tier.id);
          await this.prisma.ticketTier.update({
            where: { id: tier.id },
            data: {
              name: tier.name,
              description: tier.description,
              price: tier.price,
              quantity: existing
                ? Math.max(tier.quantity, existing.sold)
                : tier.quantity,
            },
          });
        } else {
          // Brand-new tier
          await this.prisma.ticketTier.create({
            data: {
              eventId: id,
              name: tier.name,
              description: tier.description,
              price: tier.price,
              quantity: tier.quantity,
            },
          });
        }
      }
    }

    return this.prisma.event.update({
      where: { id },
      data: updateData,
      include: { ticketTiers: true },
    });
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');

    return this.prisma.event.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw new NotFoundException('Event not found');

    // If it has paid orders, cancel instead of deleting
    if (existing._count.orders > 0) {
      return this.prisma.event.update({
        where: { id },
        data: { status: EventStatus.CANCELLED },
      });
    }

    return this.prisma.event.delete({ where: { id } });
  }

  async getAdminStats() {
    const [totalEvents, liveEvents, ticketStats, recentOrders] =
      await Promise.all([
        this.prisma.event.count(),
        this.prisma.event.count({ where: { status: EventStatus.LIVE } }),
        this.prisma.ticketTier.aggregate({
          _sum: { sold: true },
        }),
        this.prisma.order.aggregate({
          where: { status: 'PAID' },
          _sum: { total: true },
          _count: true,
        }),
      ]);

    return {
      totalEvents,
      liveEvents,
      totalTicketsSold: ticketStats._sum.sold ?? 0,
      totalRevenue: recentOrders._sum.total ?? 0, // in kobo
      totalOrders: recentOrders._count,
    };
  }
}
