import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { AuthModule } from 'src/auth/auth.module';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [VaultController],
  providers: [VaultService, PrismaService, AdminGuard],
})
export class VaultModule {}
