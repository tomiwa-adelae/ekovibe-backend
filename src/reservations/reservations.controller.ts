import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { VenueOwnerGuard } from 'src/guards/venue-owner.guard';
import { Public } from 'src/decorators/public.decorator';
import { ReservationStatus } from 'generated/prisma/client';
import { InitiateReservationDto } from './dto/initiate-reservation.dto';
import { ModifyReservationDto } from './dto/modify-reservation.dto';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ── Public: Availability ──────────────────────────────────────────────────────

  @Public()
  @Get('venues/:slug/availability')
  getAvailability(
    @Param('slug') slug: string,
    @Query('date') date: string,
    @Query('partySize') partySize: string,
  ) {
    return this.reservationsService.getAvailability(slug, date, Number(partySize) || 1);
  }

  // ── Customer: Reservations ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('reservations/initiate')
  initiateReservation(@Req() req: any, @Body() dto: InitiateReservationDto) {
    return this.reservationsService.initiateReservation(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reservations/verify')
  @HttpCode(HttpStatus.OK)
  verifyReservationPayment(@Body('paystackReference') reference: string) {
    return this.reservationsService.verifyReservationPayment(reference);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reservations/my')
  getMyReservations(@Req() req: any, @Query('status') status?: ReservationStatus) {
    return this.reservationsService.getMyReservations(req.user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reservations/my/:id')
  getReservationById(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.getReservationById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reservations/my/:id/modify')
  modifyReservation(@Req() req: any, @Param('id') id: string, @Body() dto: ModifyReservationDto) {
    return this.reservationsService.modifyReservation(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reservations/my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelReservation(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.cancelReservation(id, req.user.id);
  }

  // ── Customer: Waitlist ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('reservations/waitlist')
  joinWaitlist(@Req() req: any, @Body() dto: JoinWaitlistDto) {
    return this.reservationsService.joinWaitlist(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reservations/waitlist/my')
  getMyWaitlistEntries(@Req() req: any) {
    return this.reservationsService.getMyWaitlistEntries(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('reservations/waitlist/:id')
  leaveWaitlist(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.leaveWaitlist(id, req.user.id);
  }

  // ── Venue Owner: Reservations ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Get('venue-owner/reservations')
  getVenueOwnerReservations(
    @Req() req: any,
    @Query('status') status?: ReservationStatus,
    @Query('venueSlug') venueSlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.getVenueOwnerReservations(req.user.id, {
      status,
      venueSlug,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Get('venue-owner/reservations/:id')
  getVenueOwnerReservationById(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.getVenueOwnerReservationById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/reservations/:id/confirm')
  @HttpCode(HttpStatus.OK)
  venueOwnerConfirmReservation(
    @Req() req: any,
    @Param('id') id: string,
    @Body('venueNote') venueNote?: string,
  ) {
    return this.reservationsService.venueOwnerConfirmReservation(id, req.user.id, venueNote);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/reservations/:id/reject')
  @HttpCode(HttpStatus.OK)
  venueOwnerRejectReservation(
    @Req() req: any,
    @Param('id') id: string,
    @Body('venueNote') venueNote?: string,
  ) {
    return this.reservationsService.venueOwnerRejectReservation(id, req.user.id, venueNote);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/reservations/:id/complete')
  @HttpCode(HttpStatus.OK)
  venueOwnerMarkCompleted(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.venueOwnerMarkCompleted(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Post('venue-owner/reservations/:id/no-show')
  @HttpCode(HttpStatus.OK)
  venueOwnerMarkNoShow(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.venueOwnerMarkNoShow(id, req.user.id);
  }

  // ── Admin: Reservations ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/reservations')
  getAllReservationsAdmin(
    @Query('status') status?: ReservationStatus,
    @Query('venueId') venueId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.getAllReservationsAdmin({
      status,
      venueId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/reservations/:id/confirm')
  @HttpCode(HttpStatus.OK)
  adminOverrideConfirm(
    @Param('id') id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.reservationsService.adminOverrideConfirm(id, adminNote);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/reservations/:id/cancel')
  @HttpCode(HttpStatus.OK)
  adminOverrideCancel(
    @Param('id') id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.reservationsService.adminOverrideCancel(id, adminNote);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/reservations/waitlist/:id/notify')
  @HttpCode(HttpStatus.OK)
  adminNotifyWaitlist(@Param('id') id: string) {
    return this.reservationsService.adminNotifyWaitlist(id);
  }
}
