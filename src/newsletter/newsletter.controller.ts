import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from 'src/decorators/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Public()
  @Get('confirm')
  confirm(@Query('token') token: string) {
    return this.newsletterService.confirm(token);
  }

  @Public()
  @Get('unsubscribe')
  unsubscribe(@Query('token') token: string) {
    return this.newsletterService.unsubscribe(token);
  }

  // ── Admin routes ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/subscribers')
  getSubscribers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filter') filter?: 'confirmed' | 'pending' | 'unsubscribed' | 'all',
  ) {
    return this.newsletterService.getSubscribers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      filter,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('a/subscribers/:id')
  deleteSubscriber(@Param('id') id: string) {
    return this.newsletterService.deleteSubscriber(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/export')
  async exportCsv(@Res() res: Response) {
    const csv = await this.newsletterService.exportCsv();
    const filename = `vibe-list-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
