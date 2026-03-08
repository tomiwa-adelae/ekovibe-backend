import {
  Controller,
  Post,
  Get,
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
import { VendorGuard } from 'src/guards/vendor.guard';
import { OrdersService } from './orders.service';
import { InitiateOrderDto } from './dto/initiate-order.dto';
import { VerifyOrderDto } from './dto/verify-order.dto';
import { ScanTicketDto } from './dto/scan-ticket.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── User routes ───────────────────────────────────────────────────────────

  @Post('orders/initiate')
  @HttpCode(HttpStatus.CREATED)
  initiateOrder(@Body() dto: InitiateOrderDto, @Request() req) {
    return this.ordersService.initiateOrder(req.user.id, dto, req.user.email);
  }

  @Post('orders/verify')
  @HttpCode(HttpStatus.OK)
  verifyOrder(@Body() dto: VerifyOrderDto, @Request() req) {
    return this.ordersService.verifyAndFulfillOrder(dto, req.user.id);
  }

  @Get('orders/my-tickets')
  getMyTickets(@Request() req) {
    return this.ordersService.getUserTickets(req.user.id);
  }

  @Get('orders/my-tickets/:code')
  getMyTicketByCode(@Param('code') code: string, @Request() req) {
    return this.ordersService.getUserTicketByCode(code, req.user.id);
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @Get('a/orders')
  @UseGuards(AdminGuard)
  getAdminOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('eventId') eventId?: string,
  ) {
    return this.ordersService.getAdminOrders({ page, limit, eventId });
  }

  @Get('a/tickets/:code')
  @UseGuards(AdminGuard)
  getTicketByCode(@Param('code') code: string) {
    return this.ordersService.getTicketByCode(code);
  }

  @Post('a/tickets/scan')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  scanTicket(@Body() dto: ScanTicketDto) {
    return this.ordersService.scanTicket(dto.code);
  }

  // ── Vendor routes ─────────────────────────────────────────────────────────

  @Get('vendor/events/:id/attendees')
  @UseGuards(VendorGuard)
  getVendorEventAttendees(@Param('id') id: string, @Request() req) {
    return this.ordersService.getVendorEventAttendees(id, req.user.id);
  }

  @Get('vendor/tickets/:code')
  @UseGuards(VendorGuard)
  getVendorTicketByCode(@Param('code') code: string, @Request() req) {
    return this.ordersService.getVendorTicketByCode(code, req.user.id);
  }

  @Post('vendor/tickets/scan')
  @UseGuards(VendorGuard)
  @HttpCode(HttpStatus.OK)
  scanVendorTicket(@Body() dto: ScanTicketDto, @Request() req) {
    return this.ordersService.scanVendorTicket(dto.code, req.user.id);
  }
}
