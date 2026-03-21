import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { ReservationsController } from './reservations.controller';
import { VenuesService } from './venues.service';
import { ReservationsService } from './reservations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from 'src/guards/admin.guard';
import { VenueOwnerGuard } from 'src/guards/venue-owner.guard';
import { OrdersModule } from 'src/orders/orders.module';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [AuthModule, OrdersModule, WalletModule],
  controllers: [VenuesController, ReservationsController],
  providers: [VenuesService, ReservationsService, PrismaService, AdminGuard, VenueOwnerGuard],
})
export class ReservationsModule {}
