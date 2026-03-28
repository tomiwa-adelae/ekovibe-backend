import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
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
import { VaultService } from './vault.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateVariantDto,
  AddVariantDto,
} from './dto/update-product.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  AddToCartDto,
  UpdateCartItemDto,
  DeliveryZoneDto,
} from './dto/cart.dto';
import { EcomOrderStatus } from 'generated/prisma/client';
import { Public } from 'src/decorators/public.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  // ── Public: Products ────────────────────────────────────────────────────────

  @Public()
  @Get('vault/products')
  getPublicProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.vaultService.getPublicProducts({
      page,
      limit,
      category,
      search,
    });
  }

  @Public()
  @Get('vault/products/:slug')
  getPublicProductBySlug(@Param('slug') slug: string) {
    return this.vaultService.getPublicProductBySlug(slug);
  }

  // ── Public: Delivery Zones ──────────────────────────────────────────────────

  @Public()
  @Get('vault/delivery-zones')
  getDeliveryZones() {
    return this.vaultService.getDeliveryZones();
  }

  // ── User: Cart ──────────────────────────────────────────────────────────────

  @Get('vault/cart')
  getCart(@Request() req) {
    return this.vaultService.getCart(req.user.id);
  }

  @Post('vault/cart/items')
  @HttpCode(HttpStatus.OK)
  addToCart(@Request() req, @Body() dto: AddToCartDto) {
    return this.vaultService.addToCart(req.user.id, dto);
  }

  @Patch('vault/cart/items/:itemId')
  updateCartItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.vaultService.updateCartItem(req.user.id, itemId, dto);
  }

  @Delete('vault/cart/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCartItem(@Request() req, @Param('itemId') itemId: string) {
    return this.vaultService.removeCartItem(req.user.id, itemId);
  }

  @Delete('vault/cart')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@Request() req) {
    return this.vaultService.clearCart(req.user.id);
  }

  // ── User: Orders ─────────────────────────────────────────────────────────────

  @Post('vault/orders/initiate-paystack')
  @HttpCode(HttpStatus.CREATED)
  initiatePaystack(@Request() req, @Body() dto: PlaceOrderDto) {
    return this.vaultService.initiatePaystackOrder(
      req.user.id,
      dto,
      req.user.email,
    );
  }

  @Post('vault/orders/verify-paystack')
  @HttpCode(HttpStatus.OK)
  verifyPaystack(@Request() req, @Body('reference') reference: string) {
    return this.vaultService.verifyPaystackOrder(req.user.id, reference);
  }

  @Post('vault/orders/pay-on-delivery')
  @HttpCode(HttpStatus.CREATED)
  placePayOnDelivery(@Request() req, @Body() dto: PlaceOrderDto) {
    return this.vaultService.placePayOnDeliveryOrder(req.user.id, dto);
  }

  @Post('vault/orders/:id/retry-payment')
  @HttpCode(HttpStatus.OK)
  retryPayment(@Request() req, @Param('id') id: string) {
    return this.vaultService.retryPayment(req.user.id, id, req.user.email);
  }

  @Get('vault/orders')
  getUserOrders(@Request() req) {
    return this.vaultService.getUserOrders(req.user.id);
  }

  @Get('vault/orders/:id')
  getUserOrderById(@Request() req, @Param('id') id: string) {
    return this.vaultService.getUserOrderById(req.user.id, id);
  }

  // ── Admin: Products ──────────────────────────────────────────────────────────

  @RequireModule('vault')
  @Get('a/vault/products')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.vaultService.getAdminProducts({
      page,
      limit,
      category,
      search,
    });
  }

  @RequireModule('vault')
  @Get('a/vault/products/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminProductById(@Param('id') id: string) {
    return this.vaultService.getAdminProductById(id);
  }

  @RequireModule('vault')
  @Post('a/vault/products')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Body() dto: CreateProductDto) {
    return this.vaultService.createProduct(dto);
  }

  @RequireModule('vault')
  @Patch('a/vault/products/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.vaultService.updateProduct(id, dto);
  }

  @RequireModule('vault')
  @Delete('a/vault/products/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@Param('id') id: string) {
    return this.vaultService.deleteProduct(id);
  }

  @RequireModule('vault')
  @Post('a/vault/products/:id/variants')
  @UseGuards(AdminGuard, ModuleGuard)
  addVariant(@Param('id') id: string, @Body() dto: AddVariantDto) {
    return this.vaultService.addVariant(id, dto);
  }

  @RequireModule('vault')
  @Patch('a/vault/variants/:variantId')
  @UseGuards(AdminGuard, ModuleGuard)
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.vaultService.updateVariant(variantId, dto);
  }

  @RequireModule('vault')
  @Delete('a/vault/variants/:variantId')
  @UseGuards(AdminGuard, ModuleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVariant(@Param('variantId') variantId: string) {
    return this.vaultService.deleteVariant(variantId);
  }

  // ── Admin: Orders ─────────────────────────────────────────────────────────────

  @RequireModule('vault')
  @Get('a/vault/orders')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: EcomOrderStatus,
    @Query('search') search?: string,
  ) {
    return this.vaultService.getAdminOrders({ page, limit, status, search });
  }

  @RequireModule('vault')
  @Get('a/vault/orders/:id')
  @UseGuards(AdminGuard, ModuleGuard)
  getAdminOrderById(@Param('id') id: string) {
    return this.vaultService.getAdminOrderById(id);
  }

  @RequireModule('vault')
  @Patch('a/vault/orders/:id/status')
  @UseGuards(AdminGuard, ModuleGuard)
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.vaultService.updateOrderStatus(id, dto);
  }

  // ── Admin: Delivery Zones ───────────────────────────────────────────────────

  @RequireModule('vault')
  @Put('a/vault/delivery-zones')
  @UseGuards(AdminGuard, ModuleGuard)
  upsertDeliveryZones(@Body() zones: DeliveryZoneDto[]) {
    return this.vaultService.upsertDeliveryZones(zones);
  }
}
