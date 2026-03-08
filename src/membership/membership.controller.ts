import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CreateMembershipApplicationDto } from './dto/create-membership-application.dto';
import { Public } from 'src/decorators/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApplicationStatus } from 'generated/prisma/client';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Public()
  @Post('apply')
  submitApplication(@Body() dto: CreateMembershipApplicationDto) {
    return this.membershipService.submitApplication(dto);
  }

  @Public()
  @Get('payment/verify/:reference')
  verifyPayment(@Param('reference') reference: string) {
    return this.membershipService.verifyMembershipPayment(reference);
  }

  // ── Admin routes ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/applications')
  getApplications(
    @Query('status') status?: ApplicationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membershipService.getApplications({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/applications/:id/approve')
  approveApplication(@Param('id') id: string) {
    return this.membershipService.approveAndSendPaymentLink(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('a/applications/:id/reject')
  rejectApplication(@Param('id') id: string) {
    return this.membershipService.rejectApplication(id);
  }
}
