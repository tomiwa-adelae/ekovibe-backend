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
    return this.ordersService.initiateOrder(
      req.user.id,
      dto,
      req.user.email,
    );
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
}
