import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { Public } from 'src/decorators/public.decorator';
import { ReservationStatus } from 'generated/prisma/client';

@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ── Public: venues ──────────────────────────────────────────────────────────

  @Public()
  @Get('venues')
  getVenues(
    @Query('city') city?: string,
    @Query('type') type?: string,
  ) {
    return this.reservationsService.getVenues({ city, type });
  }

  @Public()
  @Get('venues/:id')
  getVenueById(@Param('id') id: string) {
    return this.reservationsService.getVenueById(id);
  }

  // ── Authenticated: user reservations ──────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('reservations')
  createReservation(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.createReservation(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reservations/my')
  getUserReservations(@Req() req: any) {
    return this.reservationsService.getUserReservations(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reservations/:id/cancel')
  cancelReservation(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.cancelReservation(id, req.user.id);
  }

  // ── Admin: venues ───────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/venues')
  getAllVenuesAdmin() {
    return this.reservationsService.getAllVenuesAdmin();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/venues')
  createVenue(@Body() dto: CreateVenueDto) {
    return this.reservationsService.createVenue(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('a/venues/:id')
  updateVenue(@Param('id') id: string, @Body() dto: Partial<CreateVenueDto>) {
    return this.reservationsService.updateVenue(id, dto);
  }

  // ── Admin: reservations ─────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/reservations')
  getAdminReservations(
    @Query('status') status?: ReservationStatus,
    @Query('venueId') venueId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.getAdminReservations({
      status,
      venueId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/reservations/:id/confirm')
  confirmReservation(
    @Param('id') id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.reservationsService.confirmReservation(id, adminNote);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/reservations/:id/reject')
  rejectReservation(
    @Param('id') id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.reservationsService.rejectReservation(id, adminNote);
  }
}
