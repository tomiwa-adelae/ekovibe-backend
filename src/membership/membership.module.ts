import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from 'src/guards/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [MembershipController],
  providers: [MembershipService, PrismaService, AdminGuard],
})
export class MembershipModule {}
