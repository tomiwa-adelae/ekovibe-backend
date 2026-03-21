import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import Mailjet from 'node-mailjet';
import slugify from 'slugify';
import { EcomOrderStatus, ProductCategory } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaystackService } from 'src/orders/paystack.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateVariantDto, AddVariantDto } from './dto/update-product.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddToCartDto, UpdateCartItemDto, DeliveryZoneDto } from './dto/cart.dto';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  images: true,
  category: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: { id: true, name: true, price: true, stock: true },
    orderBy: { createdAt: 'asc' as const },
  },
};

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { name: true, images: true, slug: true } },
      variant: { select: { name: true } },
    },
  },
  user: { select: { firstName: true, lastName: true, email: true } },
};

// ── Nigerian states with default delivery fees ─────────────────────────────────

const DEFAULT_ZONES = [
  { state: 'Lagos', fee: 250000 },
  { state: 'Abuja (FCT)', fee: 400000 },
  { state: 'Abia', fee: 500000 },
  { state: 'Adamawa', fee: 600000 },
  { state: 'Akwa Ibom', fee: 500000 },
  { state: 'Anambra', fee: 500000 },
  { state: 'Bauchi', fee: 600000 },
  { state: 'Bayelsa', fee: 550000 },
  { state: 'Benue', fee: 550000 },
  { state: 'Borno', fee: 650000 },
  { state: 'Cross River', fee: 550000 },
  { state: 'Delta', fee: 450000 },
  { state: 'Ebonyi', fee: 500000 },
  { state: 'Edo', fee: 400000 },
  { state: 'Ekiti', fee: 400000 },
  { state: 'Enugu', fee: 500000 },
  { state: 'Gombe', fee: 600000 },
  { state: 'Imo', fee: 500000 },
  { state: 'Jigawa', fee: 650000 },
  { state: 'Kaduna', fee: 550000 },
  { state: 'Kano', fee: 600000 },
  { state: 'Katsina', fee: 650000 },
  { state: 'Kebbi', fee: 650000 },
  { state: 'Kogi', fee: 500000 },
  { state: 'Kwara', fee: 450000 },
  { state: 'Nasarawa', fee: 450000 },
  { state: 'Niger', fee: 500000 },
  { state: 'Ogun', fee: 300000 },
  { state: 'Ondo', fee: 400000 },
  { state: 'Osun', fee: 400000 },
  { state: 'Oyo', fee: 350000 },
  { state: 'Plateau', fee: 550000 },
  { state: 'Rivers', fee: 450000 },
  { state: 'Sokoto', fee: 700000 },
  { state: 'Taraba', fee: 650000 },
  { state: 'Yobe', fee: 650000 },
  { state: 'Zamfara', fee: 700000 },
];

@Injectable()
export class VaultService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
  ) {}

  // ── Slug helper ─────────────────────────────────────────────────────────────

  private async generateUniqueSlug(name: string, excludeId?: string) {
    let base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let n = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  // ── Products (admin) ────────────────────────────────────────────────────────

  async createProduct(dto: CreateProductDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        images: dto.images ?? [],
        category: dto.category ?? ProductCategory.OTHER,
        isAvailable: dto.isAvailable ?? true,
        variants: { create: dto.variants.map((v) => ({ name: v.name, price: v.price ?? null, stock: v.stock })) },
      },
      select: PRODUCT_SELECT,
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const slug = dto.name && dto.name !== product.name
      ? await this.generateUniqueSlug(dto.name, id)
      : undefined;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name, slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
      select: PRODUCT_SELECT,
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
  }

  async addVariant(productId: string, dto: AddVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.productVariant.create({
      data: { productId, name: dto.name, price: dto.price ?? null, stock: dto.stock },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
      },
    });
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  async getAdminProducts(query: { page?: number; limit?: number; category?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.category) where.category = query.category;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: PRODUCT_SELECT }),
    ]);
    return { total, page, limit, data };
  }

  async getAdminProductById(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: PRODUCT_SELECT });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  // ── Products (public) ───────────────────────────────────────────────────────

  async getPublicProducts(query: { page?: number; limit?: number; category?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const skip = (page - 1) * limit;
    const where: any = { isAvailable: true };
    if (query.category) where.category = query.category;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, slug: true, price: true, images: true,
          category: true, isAvailable: true,
          variants: { select: { id: true, name: true, price: true, stock: true }, orderBy: { createdAt: 'asc' as const } },
        },
      }),
    ]);
    return { total, page, limit, data };
  }

  async getPublicProductBySlug(slug: string) {
    const p = await this.prisma.product.findUnique({
      where: { slug },
      select: { ...PRODUCT_SELECT, description: true },
    });
    if (!p || !p.isAvailable) throw new NotFoundException('Product not found');
    return p;
  }

  // ── Cart ────────────────────────────────────────────────────────────────────

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { include: { product: { select: { name: true, images: true, slug: true, price: true } } } } } } },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { variant: { include: { product: { select: { name: true, images: true, slug: true, price: true } } } } } } },
      });
    }
    return cart;
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (!variant.product.isAvailable) throw new BadRequestException('Product is not available');
    if (variant.stock < dto.quantity) throw new BadRequestException('Insufficient stock');

    const existing = cart.items.find((i) => i.variantId === dto.variantId);
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: dto.quantity } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: dto.variantId, quantity: dto.quantity },
      });
    }
    return this.getOrCreateCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
  }

  async removeCartItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  // ── Delivery Zones ──────────────────────────────────────────────────────────

  async getDeliveryZones() {
    const zones = await this.prisma.deliveryZone.findMany({ orderBy: { state: 'asc' } });
    if (zones.length === 0) {
      await this.prisma.deliveryZone.createMany({ data: DEFAULT_ZONES });
      return this.prisma.deliveryZone.findMany({ orderBy: { state: 'asc' } });
    }
    return zones;
  }

  async upsertDeliveryZones(zones: DeliveryZoneDto[]) {
    await Promise.all(
      zones.map((z) =>
        this.prisma.deliveryZone.upsert({
          where: { state: z.state },
          create: { state: z.state, fee: z.fee },
          update: { fee: z.fee },
        }),
      ),
    );
    return this.prisma.deliveryZone.findMany({ orderBy: { state: 'asc' } });
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  private async buildOrderItems(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items.length === 0) throw new BadRequestException('Your cart is empty');

    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
        if (!variant.product.isAvailable) throw new BadRequestException(`${variant.product.name} is no longer available`);
        if (variant.stock < item.quantity) throw new BadRequestException(`Only ${variant.stock} left in stock for "${variant.product.name} — ${variant.name}"`);
        return { item, variant };
      }),
    );

    return itemsWithDetails;
  }

  async initiatePaystackOrder(userId: string, dto: PlaceOrderDto, userEmail: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { state: dto.state } });
    if (!zone) throw new BadRequestException(`Delivery to ${dto.state} is not yet available`);

    const itemsWithDetails = await this.buildOrderItems(userId);
    const subtotal = itemsWithDetails.reduce((s, { item, variant }) => {
      const price = variant.price ?? variant.product.price;
      return s + price * item.quantity;
    }, 0);
    const total = subtotal + zone.fee;

    const randPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const reference = `EKV-VLT-${Date.now()}-${randPart}`;

    const order = await this.prisma.ecomOrder.create({
      data: {
        userId,
        paymentMethod: 'PAYSTACK',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        paystackRef: reference,
        totalAmount: subtotal,
        deliveryFee: zone.fee,
        recipientName: dto.recipientName,
        phone: dto.phone,
        addressLine: dto.addressLine,
        city: dto.city,
        state: dto.state,
        note: dto.note,
        items: {
          create: itemsWithDetails.map(({ item, variant }) => ({
            productId: variant.productId,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name,
            price: variant.price ?? variant.product.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    const paystack = await this.paystack.initializeTransaction({
      email: userEmail,
      amount: total,
      reference,
      metadata: { orderId: order.id, userId },
    });

    return { orderId: order.id, reference, accessCode: paystack.access_code, total, subtotal, deliveryFee: zone.fee };
  }

  async retryPayment(userId: string, orderId: string, userEmail: string) {
    const order = await this.prisma.ecomOrder.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== 'PAYSTACK') throw new BadRequestException('This order is not a Paystack order');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('This order has already been paid');

    const randPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const reference = `EKV-VLT-${Date.now()}-${randPart}`;
    const total = order.totalAmount + order.deliveryFee;

    await this.prisma.ecomOrder.update({
      where: { id: orderId },
      data: { paystackRef: reference },
    });

    const paystack = await this.paystack.initializeTransaction({
      email: userEmail,
      amount: total,
      reference,
      metadata: { orderId: order.id, userId },
    });

    return { orderId: order.id, reference, accessCode: paystack.access_code, total };
  }

  async verifyPaystackOrder(userId: string, reference: string) {
    const order = await this.prisma.ecomOrder.findFirst({
      where: { paystackRef: reference, userId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'PAID') return order;

    const paystackData = await this.paystack.verifyTransaction(reference);
    if (paystackData.status !== 'success') {
      await this.prisma.ecomOrder.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
      throw new BadRequestException('Payment was not successful');
    }

    const expectedTotal = order.totalAmount + order.deliveryFee;
    if (paystackData.amount !== expectedTotal) throw new BadRequestException('Payment amount mismatch');

    // Decrement stock and confirm order in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.ecomOrder.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    });

    // Clear cart
    await this.clearCart(userId);

    // Send confirmation email
    try {
      await this.sendOrderConfirmationEmail(order.user, order, 'PAYSTACK');
    } catch { /* email failure non-blocking */ }

    return this.prisma.ecomOrder.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
  }

  async placePayOnDeliveryOrder(userId: string, dto: PlaceOrderDto) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { state: dto.state } });
    if (!zone) throw new BadRequestException(`Delivery to ${dto.state} is not yet available`);

    const itemsWithDetails = await this.buildOrderItems(userId);
    const subtotal = itemsWithDetails.reduce((s, { item, variant }) => {
      return s + (variant.price ?? variant.product.price) * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ecomOrder.create({
        data: {
          userId,
          paymentMethod: 'PAY_ON_DELIVERY',
          paymentStatus: 'PENDING',
          status: 'CONFIRMED',
          totalAmount: subtotal,
          deliveryFee: zone.fee,
          recipientName: dto.recipientName,
          phone: dto.phone,
          addressLine: dto.addressLine,
          city: dto.city,
          state: dto.state,
          note: dto.note,
          items: {
            create: itemsWithDetails.map(({ item, variant }) => ({
              productId: variant.productId,
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              price: variant.price ?? variant.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      // Decrement stock
      for (const { item, variant } of itemsWithDetails) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return created;
    });

    await this.clearCart(userId);

    try {
      await this.sendOrderConfirmationEmail(order.user, order, 'PAY_ON_DELIVERY');
    } catch { /* non-blocking */ }

    return order;
  }

  async getUserOrders(userId: string) {
    return this.prisma.ecomOrder.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { name: true, images: true } }, variant: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserOrderById(userId: string, id: string) {
    const order = await this.prisma.ecomOrder.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found');
    return order;
  }

  // ── Admin Orders ─────────────────────────────────────────────────────────────

  async getAdminOrders(query: { page?: number; limit?: number; status?: EcomOrderStatus; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { recipientName: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [total, data] = await Promise.all([
      this.prisma.ecomOrder.count({ where }),
      this.prisma.ecomOrder.findMany({
        where, skip, take: limit,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, data };
  }

  async getAdminOrderById(id: string) {
    const order = await this.prisma.ecomOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.ecomOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.ecomOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
        ...(dto.note !== undefined && { note: dto.note }),
        // Mark COD as paid on delivery
        ...(dto.status === 'DELIVERED' && order.paymentMethod === 'PAY_ON_DELIVERY' && { paymentStatus: 'PAID' }),
      },
      include: ORDER_INCLUDE,
    });

    // Notify customer by email
    try {
      await this.sendOrderStatusEmail(updated.user, updated);
    } catch { /* non-blocking */ }

    return updated;
  }

  // ── Emails ──────────────────────────────────────────────────────────────────

  private async sendOrderConfirmationEmail(
    user: { firstName: string; email: string },
    order: any,
    method: 'PAYSTACK' | 'PAY_ON_DELIVERY',
  ) {
    const itemList = order.items
      .map((i: any) => `<li>${i.productName} — ${i.variantName} × ${i.quantity}</li>`)
      .join('');
    const total = ((order.totalAmount + order.deliveryFee) / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });

    await getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
          To: [{ Email: user.email, Name: user.firstName }],
          Subject: `Order Confirmed — Ekovibe Vault`,
          HTMLPart: `
            <h2>Hi ${user.firstName}, your order is confirmed!</h2>
            <p><strong>Order total:</strong> ${total}</p>
            <p><strong>Payment:</strong> ${method === 'PAY_ON_DELIVERY' ? 'Pay on delivery' : 'Paid online'}</p>
            <p><strong>Delivery to:</strong> ${order.addressLine}, ${order.city}, ${order.state}</p>
            <ul>${itemList}</ul>
            <p>We'll keep you updated as your order is processed. Thank you for shopping with Ekovibe!</p>
          `,
        }],
      });
  }

  private async sendOrderStatusEmail(user: { firstName: string; email: string }, order: any) {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed and is being prepared.',
      PROCESSING: 'Your order is being packed and will be dispatched soon.',
      SHIPPED: `Your order is on its way!${order.trackingNumber ? ` Tracking: ${order.trackingNumber}` : ''}`,
      DELIVERED: 'Your order has been delivered. Enjoy!',
      CANCELLED: 'Your order has been cancelled. If you paid online, a refund will be processed.',
    };

    const message = statusMessages[order.status];
    if (!message) return;

    await getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: { Email: process.env.SENDER_EMAIL_ADDRESS, Name: 'Ekovibe' },
          To: [{ Email: user.email, Name: user.firstName }],
          Subject: `Order Update: ${order.status} — Ekovibe Vault`,
          HTMLPart: `<h2>Hi ${user.firstName},</h2><p>${message}</p>`,
        }],
      });
  }
}
