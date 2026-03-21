import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { ResolveWithdrawalDto } from './dto/resolve-withdrawal.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WithdrawalStatus } from 'generated/prisma/client';
import { VendorGuard } from 'src/guards/vendor.guard';
import { VenueOwnerGuard } from 'src/guards/venue-owner.guard';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ── Vendor routes ───────────────────────────────────────────────────────────

  @Get('vendor/wallet')
  @UseGuards(JwtAuthGuard, VendorGuard)
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @Get('vendor/wallet/withdrawals')
  @UseGuards(JwtAuthGuard, VendorGuard)
  getWithdrawalHistory(@Req() req: any) {
    return this.walletService.getWithdrawalHistory(req.user.id);
  }

  @Post('vendor/wallet/withdraw')
  @UseGuards(JwtAuthGuard, VendorGuard)
  requestWithdrawal(@Req() req: any, @Body() dto: RequestWithdrawalDto) {
    return this.walletService.requestWithdrawal(req.user.id, dto);
  }

  @Get('vendor/wallet/banks')
  @UseGuards(JwtAuthGuard, VendorGuard)
  listBanks() {
    return this.walletService.listBanks();
  }

  @Get('vendor/wallet/verify-account')
  @UseGuards(JwtAuthGuard, VendorGuard)
  verifyAccount(
    @Query('account_number') accountNumber: string,
    @Query('bank_code') bankCode: string,
  ) {
    return this.walletService.verifyBankAccount(accountNumber, bankCode);
  }

  // ── Venue Owner routes ──────────────────────────────────────────────────────

  @Get('venue-owner/wallet')
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  getVenueOwnerWallet(@Req() req: any) {
    return this.walletService.getVenueOwnerWallet(req.venueOwner.id);
  }

  @Get('venue-owner/wallet/withdrawals')
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  getVenueOwnerWithdrawals(@Req() req: any) {
    return this.walletService.getVenueOwnerWithdrawals(req.venueOwner.id);
  }

  @Post('venue-owner/wallet/withdraw')
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  requestVenueOwnerWithdrawal(
    @Req() req: any,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.walletService.requestVenueOwnerWithdrawal(
      req.venueOwner.id,
      dto,
    );
  }

  // ── Shared utility routes (any authenticated user) ──────────────────────────

  @Get('banks')
  @UseGuards(JwtAuthGuard)
  listBanksShared() {
    return this.walletService.listBanks();
  }

  @Get('verify-account')
  @UseGuards(JwtAuthGuard)
  verifyAccountShared(
    @Query('account_number') accountNumber: string,
    @Query('bank_code') bankCode: string,
  ) {
    return this.walletService.verifyBankAccount(accountNumber, bankCode);
  }

  // ── Admin routes ────────────────────────────────────────────────────────────

  @Get('a/withdrawals')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getAdminWithdrawals({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('a/withdrawals/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approveWithdrawal(
    @Param('id') id: string,
    @Body() dto: ResolveWithdrawalDto,
  ) {
    return this.walletService.approveAndTransfer(id, dto.note);
  }

  @Post('a/withdrawals/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  rejectWithdrawal(@Param('id') id: string, @Body() dto: ResolveWithdrawalDto) {
    return this.walletService.rejectWithdrawal(id, dto.note);
  }

  // ── Admin: Venue Owner Withdrawals ──────────────────────────────────────────

  @Get('a/venue-owner-withdrawals')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminVenueOwnerWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getAdminVenueOwnerWithdrawals({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('a/venue-owner-withdrawals/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  approveVenueOwnerWithdrawal(
    @Param('id') id: string,
    @Body() dto: ResolveWithdrawalDto,
  ) {
    return this.walletService.approveVenueOwnerWithdrawal(id, dto.note);
  }

  @Post('a/venue-owner-withdrawals/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  rejectVenueOwnerWithdrawal(
    @Param('id') id: string,
    @Body() dto: ResolveWithdrawalDto,
  ) {
    return this.walletService.rejectVenueOwnerWithdrawal(id, dto.note);
  }
}
