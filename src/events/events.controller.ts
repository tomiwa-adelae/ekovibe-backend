import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { Public } from 'src/decorators/public.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto, UpdateEventStatusDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Public routes ─────────────────────────────────────────────────────────

  @Public()
  @Get('events')
  getPublicEvents(@Query() query: EventQueryDto) {
    return this.eventsService.findPublished(query);
  }

  @Public()
  @Get('events/:slug')
  getEventBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @Get('a/events/stats')
  @UseGuards(AdminGuard)
  getAdminStats() {
    return this.eventsService.getAdminStats();
  }

  @Get('a/events')
  @UseGuards(AdminGuard)
  getAdminEvents(@Query() query: EventQueryDto) {
    return this.eventsService.findAllAdmin(query);
  }

  @Get('a/events/:id')
  @UseGuards(AdminGuard)
  getAdminEventById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Post('a/events')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createEvent(@Body() dto: CreateEventDto, @Request() req) {
    return this.eventsService.create(dto, req.user.id);
  }

  @Patch('a/events/:id')
  @UseGuards(AdminGuard)
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Patch('a/events/:id/status')
  @UseGuards(AdminGuard)
  updateEventStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, dto);
  }

  @Delete('a/events/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.delete(id);
  }
}
