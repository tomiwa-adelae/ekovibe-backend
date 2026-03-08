import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaystackService } from './paystack.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { VendorGuard } from 'src/guards/vendor.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, PaystackService, PrismaService, AdminGuard, VendorGuard],
})
export class OrdersModule {}
