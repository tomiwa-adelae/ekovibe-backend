import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import Mailjet from 'node-mailjet';
import { WithdrawalStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { WithdrawalApprovedEmail } from 'emails/withdrawal-approved-email';
import { WithdrawalRejectedEmail } from 'emails/withdrawal-rejected-email';

const PAYSTACK_BASE = 'https://api.paystack.co';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private paystackHeaders() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  // ── Vendor ─────────────────────────────────────────────────────────────────

  async getWallet(vendorId: string) {
    const wallet = await this.prisma.vendorWallet.upsert({
      where: { vendorId },
      create: { vendorId, balance: 0 },
      update: {},
    });
    return wallet;
  }

  async getWithdrawalHistory(vendorId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestWithdrawal(vendorId: string, dto: RequestWithdrawalDto) {
    const wallet = await this.getWallet(vendorId);

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const pending = await this.prisma.withdrawalRequest.count({
      where: { vendorId, status: WithdrawalStatus.PENDING },
    });
    if (pending > 0) {
      throw new BadRequestException(
        'You already have a pending withdrawal request',
      );
    }

    // Deduct from wallet and create request atomically
    const [, request] = await this.prisma.$transaction([
      this.prisma.vendorWallet.update({
        where: { vendorId },
        data: { balance: { decrement: dto.amount } },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          vendorId,
          amount: dto.amount,
          bankCode: dto.bankCode,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
        },
      }),
    ]);

    return request;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getAdminWithdrawals(query: {
    status?: WithdrawalStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [requests, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              vendorProfile: { select: { brandName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveAndTransfer(id: string, note?: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        vendor: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Request is not in PENDING state');
    }

    // Create Paystack transfer recipient
    const recipientRes = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
      method: 'POST',
      headers: this.paystackHeaders(),
      body: JSON.stringify({
        type: 'nuban',
        name: request.accountName,
        account_number: request.accountNumber,
        bank_code: request.bankCode,
        currency: 'NGN',
      }),
    });
    const recipientData = await recipientRes.json();
    if (!recipientData.status) {
      throw new BadGatewayException(
        `Failed to create transfer recipient: ${recipientData.message}`,
      );
    }
    const recipientCode = recipientData.data.recipient_code;

    // Initiate transfer
    const transferRes = await fetch(`${PAYSTACK_BASE}/transfer`, {
      method: 'POST',
      headers: this.paystackHeaders(),
      body: JSON.stringify({
        source: 'balance',
        amount: request.amount,
        recipient: recipientCode,
        reason: `Ekovibe payout — ${request.vendor.firstName} ${request.vendor.lastName}`,
      }),
    });
    const transferData = await transferRes.json();
    if (!transferData.status) {
      // Refund wallet if transfer fails
      await this.prisma.vendorWallet.update({
        where: { vendorId: request.vendorId },
        data: { balance: { increment: request.amount } },
      });
      throw new BadGatewayException(
        `Paystack transfer failed: ${transferData.message}`,
      );
    }

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: WithdrawalStatus.TRANSFERRED,
        paystackRef: transferData.data.transfer_code,
        note: note ?? null,
        resolvedAt: new Date(),
      },
    });

    try {
      await getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
              To: [{ Email: request.vendor.email, Name: request.vendor.firstName }],
              Subject: `Withdrawal Approved — ${formatNaira(request.amount)}`,
              HTMLPart: WithdrawalApprovedEmail({
                firstName: request.vendor.firstName,
                amount: formatNaira(request.amount),
                accountNumber: request.accountNumber,
                accountName: request.accountName,
                reference: transferData.data.transfer_code,
              }),
            },
          ],
        });
    } catch {
      // Email failure should not block the response
    }

    return updated;
  }

  async rejectWithdrawal(id: string, note?: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        vendor: { select: { firstName: true, email: true } },
      },
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Request is not in PENDING state');
    }

    // Refund wallet
    await this.prisma.$transaction([
      this.prisma.vendorWallet.update({
        where: { vendorId: request.vendorId },
        data: { balance: { increment: request.amount } },
      }),
      this.prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.REJECTED,
          note: note ?? null,
          resolvedAt: new Date(),
        },
      }),
    ]);

    try {
      await getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
              To: [{ Email: request.vendor.email, Name: request.vendor.firstName }],
              Subject: `Withdrawal Request Update — ${formatNaira(request.amount)}`,
              HTMLPart: WithdrawalRejectedEmail({
                firstName: request.vendor.firstName,
                amount: formatNaira(request.amount),
                note: note ?? undefined,
              }),
            },
          ],
        });
    } catch {
      // Email failure should not block the response
    }

    return { success: true };
  }

  // ── Utility (called by OrdersService) ──────────────────────────────────────

  async creditVendorWallet(vendorId: string, amount: number) {
    await this.prisma.vendorWallet.upsert({
      where: { vendorId },
      create: { vendorId, balance: amount },
      update: { balance: { increment: amount } },
    });
  }

  // ── Paystack helpers (proxied to frontend) ─────────────────────────────────

  async listBanks() {
    const res = await fetch(`${PAYSTACK_BASE}/bank?currency=NGN&perPage=100`, {
      headers: this.paystackHeaders(),
    });
    const data = await res.json();
    if (!data.status) throw new BadGatewayException('Failed to fetch banks');
    return data.data as { name: string; code: string }[];
  }

  async verifyBankAccount(accountNumber: string, bankCode: string) {
    const res = await fetch(
      `${PAYSTACK_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: this.paystackHeaders() },
    );
    const data = await res.json();
    if (!data.status)
      throw new BadRequestException(
        data.message ?? 'Could not verify account',
      );
    return data.data as { account_name: string; account_number: string };
  }
}
