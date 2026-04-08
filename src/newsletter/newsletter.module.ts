import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminGuard } from 'src/guards/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [NewsletterController],
  providers: [NewsletterService, PrismaService, AdminGuard],
})
export class NewsletterModule {}
