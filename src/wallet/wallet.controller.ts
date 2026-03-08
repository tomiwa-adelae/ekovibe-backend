import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { ResolveWithdrawalDto } from './dto/resolve-withdrawal.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WithdrawalStatus } from 'generated/prisma/client';
import { VendorGuard } from 'src/guards/vendor.guard';
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
}
