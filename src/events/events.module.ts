import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { ModuleGuard } from 'src/guards/module.guard';
import { VendorGuard } from 'src/guards/vendor.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService, PrismaService, AdminGuard, ModuleGuard, VendorGuard],
  exports: [EventsService],
})
export class EventsModule {}
