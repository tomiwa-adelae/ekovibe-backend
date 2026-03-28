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
import { ModuleGuard } from 'src/guards/module.guard';
import { VendorGuard } from 'src/guards/vendor.guard';
import { RequireModule } from 'src/decorators/require-module.decorator';
import { Public } from 'src/decorators/public.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto, UpdateEventStatusDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { RejectEventDto } from './dto/review-event.dto';

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

  @RequireModule('events')
  @Get('a/events/stats')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminStats() {
    return this.eventsService.getAdminStats();
  }

  @RequireModule('events')
  @Get('a/events')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminEvents(@Query() query: EventQueryDto) {
    return this.eventsService.findAllAdmin(query);
  }

  @RequireModule('events')
  @Get('a/events/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminEventById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @RequireModule('events')
  @Post('a/events')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.CREATED)
  createEvent(@Body() dto: CreateEventDto, @Request() req) {
    return this.eventsService.create(dto, req.user.id);
  }

  @RequireModule('events')
  @Patch('a/events/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @RequireModule('events')
  @Patch('a/events/:id/status')
  @UseGuards(AdminGuard, ModuleGuard)
  updateEventStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, dto);
  }

  @RequireModule('events')
  @Post('a/events/:id/approve')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.OK)
  approveEvent(@Param('id') id: string) {
    return this.eventsService.approveEvent(id);
  }

  @RequireModule('events')
  @Post('a/events/:id/reject')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.OK)
  rejectEvent(@Param('id') id: string, @Body() dto: RejectEventDto) {
    return this.eventsService.rejectEvent(id, dto.reason);
  }

  @RequireModule('events')
  @Delete('a/events/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.OK)
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.delete(id);
  }

  // ── Vendor routes ─────────────────────────────────────────────────────────

  @Get('vendor/events/stats')
  @UseGuards(VendorGuard)
  getVendorStats(@Request() req) {
    return this.eventsService.getVendorStats(req.user.id);
  }

  @Get('vendor/events')
  @UseGuards(VendorGuard)
  getVendorEvents(@Query() query: EventQueryDto, @Request() req) {
    return this.eventsService.findVendorEvents(req.user.id, query);
  }

  @Get('vendor/events/:id')
  @UseGuards(VendorGuard)
  getVendorEventById(@Param('id') id: string, @Request() req) {
    return this.eventsService.findVendorEventById(id, req.user.id);
  }

  @Post('vendor/events')
  @UseGuards(VendorGuard)
  @HttpCode(HttpStatus.CREATED)
  createVendorEvent(@Body() dto: CreateEventDto, @Request() req) {
    return this.eventsService.createByVendor(dto, req.user.id);
  }

  @Post('vendor/events/:id/resubmit')
  @UseGuards(VendorGuard)
  @HttpCode(HttpStatus.OK)
  resubmitVendorEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.resubmitByVendor(id, req.user.id);
  }

  @Patch('vendor/events/:id')
  @UseGuards(VendorGuard)
  updateVendorEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.updateByVendor(id, req.user.id, dto);
  }

  @Patch('vendor/events/:id/status')
  @UseGuards(VendorGuard)
  updateVendorEventStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @Request() req,
  ) {
    return this.eventsService.updateStatusByVendor(id, req.user.id, dto);
  }

  @Delete('vendor/events/:id')
  @UseGuards(VendorGuard)
  @HttpCode(HttpStatus.OK)
  deleteVendorEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.deleteByVendor(id, req.user.id);
  }
}
