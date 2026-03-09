import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from 'src/guards/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, PrismaService, AdminGuard],
})
export class MediaModule {}
