import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ModuleGuard } from 'src/guards/module.guard';
import { RequireModule } from 'src/decorators/require-module.decorator';
import { MediaService } from './media.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ── Public ──────────────────────────────────────────────────────────────────

  @Public()
  @Get('media')
  getPublishedPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('exclude') exclude?: string,
    @Query('featured') featured?: string,
  ) {
    return this.mediaService.getPublishedPosts({
      page,
      limit,
      category,
      search,
      tag,
      exclude,
      featured: featured === 'true',
    });
  }

  @Public()
  @Get('media/:slug')
  getPublishedPostBySlug(@Param('slug') slug: string) {
    return this.mediaService.getPublishedPostBySlug(slug);
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  @RequireModule('media')
  @Get('a/media')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  getAdminPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: any,
    @Query('search') search?: string,
  ) {
    return this.mediaService.getAdminPosts({ page, limit, status, search });
  }

  @RequireModule('media')
  @Get('a/media/:id')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  getAdminPostById(@Param('id') id: string) {
    return this.mediaService.getAdminPostById(id);
  }

  @RequireModule('media')
  @Post('a/media')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() dto: CreatePostDto, @Request() req) {
    return this.mediaService.createPost(req.user.id, dto);
  }

  @RequireModule('media')
  @Patch('a/media/:id')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.mediaService.updatePost(id, dto);
  }

  @RequireModule('media')
  @Patch('a/media/:id/publish')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  publishPost(@Param('id') id: string) {
    return this.mediaService.publishPost(id);
  }

  @RequireModule('media')
  @Patch('a/media/:id/unpublish')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  unpublishPost(@Param('id') id: string) {
    return this.mediaService.unpublishPost(id);
  }

  @RequireModule('media')
  @Patch('a/media/:id/feature')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  featurePost(@Param('id') id: string) {
    return this.mediaService.featurePost(id);
  }

  @RequireModule('media')
  @Patch('a/media/:id/unfeature')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  unfeaturePost(@Param('id') id: string) {
    return this.mediaService.unfeaturePost(id);
  }

  @RequireModule('media')
  @Delete('a/media/:id')
  @UseGuards(JwtAuthGuard, AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param('id') id: string) {
    return this.mediaService.deletePost(id);
  }
}
