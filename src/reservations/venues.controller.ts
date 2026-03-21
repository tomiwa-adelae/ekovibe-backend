import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { VenueOwnerGuard } from 'src/guards/venue-owner.guard';
import { Public } from 'src/decorators/public.decorator';
import { VenueStatus, VenueCategory } from 'generated/prisma/client';
import { OnboardVenueOwnerDto } from './dto/onboard-venue-owner.dto';
import { ApplyVenueDto, UpdateVenueDto } from './dto/apply-venue.dto';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/create-space.dto';
import { SetOperatingHoursDto } from './dto/set-operating-hours.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/create-session.dto';
import { BlockDateDto } from './dto/block-date.dto';
import { SetPolicyDto } from './dto/set-policy.dto';

@Controller()
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // ── Public ────────────────────────────────────────────────────────────────────

  @Public()
  @Get('venues')
  getVenues(
    @Query('city') city?: string,
    @Query('category') category?: VenueCategory,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.venuesService.getVenues({
      city,
      category,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get('venues/:slug')
  getVenueBySlug(@Param('slug') slug: string) {
    return this.venuesService.getVenueBySlug(slug);
  }

  // ── Venue Owner: Onboarding ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('venue-owner/onboard')
  onboardVenueOwner(@Req() req: any, @Body() dto: OnboardVenueOwnerDto) {
    return this.venuesService.onboardVenueOwner(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('venue-owner/me')
  getMyOwnerProfile(@Req() req: any) {
    return this.venuesService.getMyOwnerProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('venue-owner/me')
  updateMyOwnerProfile(@Req() req: any, @Body() dto: Partial<OnboardVenueOwnerDto>) {
    return this.venuesService.updateMyOwnerProfile(req.user.id, dto);
  }

  // ── Venue Owner: Venue Management ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/venues')
  applyVenue(@Req() req: any, @Body() dto: ApplyVenueDto) {
    return this.venuesService.applyVenue(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Get('venue-owner/venues')
  getMyVenues(@Req() req: any) {
    return this.venuesService.getMyVenues(req.user.id);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Get('venue-owner/venues/:slug')
  getMyVenueBySlug(@Req() req: any, @Param('slug') slug: string) {
    return this.venuesService.getMyVenueBySlug(slug, req.user.id);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch('venue-owner/venues/:slug')
  updateVenue(@Req() req: any, @Param('slug') slug: string, @Body() dto: UpdateVenueDto) {
    return this.venuesService.updateVenue(slug, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('venue-owner/venues/:slug/images')
  updateVenueImages(
    @Req() req: any,
    @Param('slug') slug: string,
    @Body('images') images: string[],
  ) {
    return this.venuesService.updateVenueImages(slug, req.user.id, images);
  }

  // ── Venue Owner: Spaces ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/venues/:slug/spaces')
  addSpace(@Req() req: any, @Param('slug') slug: string, @Body() dto: CreateSpaceDto) {
    return this.venuesService.addSpace(slug, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch('venue-owner/venues/:slug/spaces/:spaceId')
  updateSpace(
    @Req() req: any,
    @Param('slug') slug: string,
    @Param('spaceId') spaceId: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.venuesService.updateSpace(slug, spaceId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('venue-owner/venues/:slug/spaces/:spaceId')
  removeSpace(@Req() req: any, @Param('slug') slug: string, @Param('spaceId') spaceId: string) {
    return this.venuesService.removeSpace(slug, spaceId, req.user.id);
  }

  // ── Venue Owner: Operating Hours ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Put('venue-owner/venues/:slug/hours')
  setOperatingHours(
    @Req() req: any,
    @Param('slug') slug: string,
    @Body() dto: SetOperatingHoursDto,
  ) {
    return this.venuesService.setOperatingHours(slug, req.user.id, dto);
  }

  // ── Venue Owner: Sessions ─────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/venues/:slug/sessions')
  addSession(@Req() req: any, @Param('slug') slug: string, @Body() dto: CreateSessionDto) {
    return this.venuesService.addSession(slug, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch('venue-owner/venues/:slug/sessions/:sessionId')
  updateSession(
    @Req() req: any,
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.venuesService.updateSession(slug, sessionId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('venue-owner/venues/:slug/sessions/:sessionId')
  removeSession(
    @Req() req: any,
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.venuesService.removeSession(slug, sessionId, req.user.id);
  }

  // ── Venue Owner: Blocked Dates ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/venues/:slug/blocked-dates')
  blockDate(@Req() req: any, @Param('slug') slug: string, @Body() dto: BlockDateDto) {
    return this.venuesService.blockDate(slug, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('venue-owner/venues/:slug/blocked-dates/:blockId')
  unblockDate(
    @Req() req: any,
    @Param('slug') slug: string,
    @Param('blockId') blockId: string,
  ) {
    return this.venuesService.unblockDate(slug, blockId, req.user.id);
  }

  // ── Venue Owner: Policy ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Put('venue-owner/venues/:slug/policy')
  setPolicy(@Req() req: any, @Param('slug') slug: string, @Body() dto: SetPolicyDto) {
    return this.venuesService.setPolicy(slug, req.user.id, dto);
  }

  // ── Admin: Venues ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/venues')
  getAllVenuesAdmin(
    @Query('status') status?: VenueStatus,
    @Query('category') category?: VenueCategory,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.venuesService.getAllVenuesAdmin({
      status,
      category,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/venues/:id')
  getVenueByIdAdmin(@Param('id') id: string) {
    return this.venuesService.getVenueByIdAdmin(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/venues/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveVenue(@Param('id') id: string) {
    return this.venuesService.approveVenue(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/venues/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectVenue(@Param('id') id: string, @Body('reason') reason: string) {
    return this.venuesService.rejectVenue(id, reason);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/venues/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspendVenue(@Param('id') id: string) {
    return this.venuesService.suspendVenue(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('a/venues/:id/platform-fee')
  updatePlatformFee(@Param('id') id: string, @Body('platformFeePercent') fee: number) {
    return this.venuesService.updatePlatformFee(id, fee);
  }
}
