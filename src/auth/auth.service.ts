import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import Mailjet from 'node-mailjet';
import slugify from 'slugify';
import { UserResponseDto } from './dto/user-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { notDeleted } from 'src/utils/prismaFilters';
import { RegisterUserDto } from './dto/register-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { WelcomeEmail } from 'emails/welcome-email';
import { ForgotPasswordEmail } from 'emails/forgot-password-email';

function getMailjet() {
  return Mailjet.apiConnect(
    process.env.MAILJET_API_PUBLIC_KEY!,
    process.env.MAILJET_API_PRIVATE_KEY!,
  );
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponseDto;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  isTwoFactorAuthenticated?: boolean;
}

// 30-day sessions: users stay logged in for 30 days of inactivity.
// Every refresh rotates the token, so active users never expire.
const SESSION_DURATION = '30d';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  getAcronym(name?: string) {
    if (!name) return 'EMS';
    const words = name.trim().split(/\s+/);
    return words
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase())
      .join('');
  }

  generatePrefix(length = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  // Access tokens are short-lived (15 min) — the axios interceptor refreshes
  // them silently so the user never notices.
  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET, // validated by JwtStrategy
      expiresIn: '15m',
    });
  }

  // Refresh tokens are long-lived (30 days) and rotated on every use.
  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: SESSION_DURATION,
    });
  }

  async hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, 10);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email, ...notDeleted() },
    });

    if (!user) return null;
    if (!user.password)
      throw new UnauthorizedException(
        'This account uses google sign-in. Please use "Continue with Google" button',
      );

    if (await bcrypt.compare(password, user.password)) {
      const { password, refreshToken, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      isTwoFactorAuthenticated: false,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store plain-text refresh token — refreshTokens() does a direct string
    // comparison (consistent with existing records in the DB).
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
      include: { admin: true },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: plainToClass(
        UserResponseDto,
        {
          ...updatedUser,
          isAdmin: !!updatedUser.admin,
          isVendor: updatedUser.role === 'VENDOR',
        },
        { excludeExtraneousValues: true },
      ),
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    if (registerUserDto.password !== registerUserDto.confirmPassword)
      throw new ConflictException('Password do not match');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerUserDto.email },
    });

    if (existingUser) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    let baseUsername = slugify(
      `${registerUserDto.firstName} ${registerUserDto.lastName}`,
    );
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}-${counter}`;
      counter++;
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: registerUserDto.firstName,
        lastName: registerUserDto.lastName,
        email: registerUserDto.email,
        password: hashedPassword,
        username,
        role: 'USER',
        userTier: registerUserDto.tier,
      },
    });

    await getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.SENDER_EMAIL_ADDRESS,
              Name: 'Ekovibe',
            },
            To: [{ Email: user.email, Name: user.firstName }],
            Subject: `Welcome to Ekovibe, ${user.firstName}`,
            HTMLPart: WelcomeEmail({
              firstName: user.firstName,
            }),
          },
        ],
      });

    const { password, refreshToken, ...result } = user;
    return this.login(result);
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, ...notDeleted() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        onboardingCompleted: true,
        userTier: true,
      },
    });

    if (!user) throw new ConflictException('Oops! User not found');

    return user;
  }

  async verifyCode(otp: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, ...notDeleted() },
    });

    if (!user) throw new NotFoundException('No account with that email');
    if (!user.resetOTP)
      throw new UnauthorizedException('Invalid or expired OTP');
    if (user.resetOTPExpiry! < new Date())
      throw new UnauthorizedException('OTP has expired');

    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) throw new UnauthorizedException('Invalid OTP');

    return { message: 'OTP verification successful' };
  }

  async setNewPassword({
    email,
    otp,
    newPassword,
    confirmPassword,
  }: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (newPassword !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    const user = await this.prisma.user.findUnique({
      where: { email, ...notDeleted() },
    });

    if (!user) throw new NotFoundException('No account with that email');
    if (!user.resetOTP)
      throw new UnauthorizedException('Invalid or expired OTP');
    if (user.resetOTPExpiry! < new Date())
      throw new UnauthorizedException('OTP has expired');

    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) throw new UnauthorizedException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword, resetOTP: null, resetOTPExpiry: null },
    });

    return { message: 'Password reset successfully.' };
  }

  async sendPasswordResetOTP(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, ...notDeleted() },
    });

    if (!user) throw new BadRequestException('No account with that email');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOTP = await bcrypt.hash(otp, 10);

    await this.prisma.user.update({
      where: { email },
      data: { resetOTP: hashedOTP, resetOTPExpiry: expiry },
    });

    await getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.SENDER_EMAIL_ADDRESS,
              Name: 'Ekovibe',
            },
            To: [{ Email: email, Name: user.firstName }],
            Subject: `Password Reset Code`,
            HTMLPart: ForgotPasswordEmail({
              firstName: user.firstName,
              otp,
            }),
          },
        ],
      });

    return { message: 'Password reset OTP sent to your email' };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  // Verify the JWT to get the user ID directly (O(1), no full-table scan).
  // We allow expired tokens so logout still works after long inactivity.
  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        ignoreExpiration: true,
      });

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { refreshToken: null },
      });
    } catch {
      // Malformed / tampered token — ignore, cookies are cleared by controller
    }

    return { message: 'User logged out' };
  }

  // ── Token refresh ─────────────────────────────────────────────────────────
  // 1. Verify the refresh token JWT (checks signature + expiry)
  // 2. Fetch the user by the ID in the payload — O(1) lookup
  // 3. Confirm the stored DB token matches the incoming one (detects reuse after rotation)
  // 4. Rotate: issue a fresh access token (JWT_SECRET) + refresh token (JWT_REFRESH_SECRET)
  async refreshTokens(refreshToken: string) {
    // Step 1 — validate the JWT itself
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      return null; // expired or tampered
    }

    // Step 2 — load the user by ID embedded in the token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        onboardingCompleted: true,
        refreshToken: true,
      },
    });

    if (!user || !user.refreshToken) {
      return null; // deleted user or already logged out
    }

    // Step 3 — confirm the token matches what we stored (plain-text)
    if (user.refreshToken !== refreshToken) {
      // Possible refresh-token-reuse attack: revoke all tokens for this user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      return null;
    }

    // Step 4 — rotate tokens
    const newPayload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.generateAccessToken(newPayload); // JWT_SECRET
    const newRefreshToken = this.generateRefreshToken(newPayload); // JWT_REFRESH_SECRET

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    const { refreshToken: _omit, ...safeUser } = user;
    return { accessToken, newRefreshToken, user: safeUser };
  }

  // ── Update Profile ─────────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    dto: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
      gender?: string;
      dob?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        gender: dto.gender,
        dob: dto.dob,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
      },
      include: { admin: true },
    });

    const { password, refreshToken, ...safe } = user;
    return plainToClass(
      UserResponseDto,
      { ...safe, isAdmin: !!user.admin, isVendor: user.role === 'VENDOR' },
      { excludeExtraneousValues: true },
    );
  }

  // ── Change Password ────────────────────────────────────────────────────────
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new BadRequestException('Cannot change password for this account');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password updated successfully' };
  }

  // ── Complete Onboarding ────────────────────────────────────────────────────
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    if (dto.accountType === 'vendor') {
      if (!dto.brandName)
        throw new BadRequestException('Brand name is required');

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: 'VENDOR',
          onboardingCompleted: true,
          interests: dto.interests ?? [],
          vendorProfile: {
            create: {
              brandName: dto.brandName,
              brandBio: dto.brandBio,
              website: dto.website,
              instagram: dto.instagram,
            },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: 'USER',
          onboardingCompleted: true,
          interests: dto.interests ?? [],
        },
      });
    }

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true, vendorProfile: true },
    });

    return plainToClass(
      UserResponseDto,
      {
        ...updated,
        isAdmin: !!updated?.admin,
        isVendor: updated?.role === 'VENDOR',
      },
      { excludeExtraneousValues: true },
    );
  }

  // ── Get / Update Vendor Profile ────────────────────────────────────────────
  async getVendorProfile(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Vendor profile not found');
    return profile;
  }

  async updateVendorProfile(
    userId: string,
    dto: {
      brandName?: string;
      brandBio?: string;
      website?: string;
      instagram?: string;
      logoUrl?: string;
    },
  ) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Vendor profile not found');

    return this.prisma.vendorProfile.update({
      where: { userId },
      data: {
        ...(dto.brandName !== undefined && { brandName: dto.brandName }),
        ...(dto.brandBio !== undefined && { brandBio: dto.brandBio }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  // Expose session duration in ms so the controller can set consistent cookie maxAge
  getSessionMs(): number {
    return SESSION_MS;
  }

  // ── Admin: vendor management ───────────────────────────────────────────────
  async getAdminVendorById(id: string) {
    const vendor = await this.prisma.user.findUnique({
      where: { id },
      include: {
        vendorProfile: true,
        wallet: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
        withdrawalRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!vendor || vendor.role !== 'VENDOR') {
      throw new NotFoundException('Vendor not found');
    }

    const [revenueKobo, ticketsSold] = await Promise.all([
      this.prisma.order.aggregate({
        where: { event: { createdById: id }, status: 'PAID' },
        _sum: { subtotal: true },
      }),
      this.prisma.ticketTier.aggregate({
        where: { event: { createdById: id } },
        _sum: { sold: true },
      }),
    ]);

    const eventsWithRevenue = await Promise.all(
      vendor.events.map(async (event) => {
        const [rev, sold] = await Promise.all([
          this.prisma.order.aggregate({
            where: { eventId: event.id, status: 'PAID' },
            _sum: { subtotal: true },
          }),
          this.prisma.ticketTier.aggregate({
            where: { eventId: event.id },
            _sum: { sold: true },
          }),
        ]);
        return {
          ...event,
          totalRevenue: rev._sum.subtotal ?? 0,
          totalSold: sold._sum.sold ?? 0,
        };
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...safe } = vendor as typeof vendor & Record<string, any>;
    return {
      ...safe,
      events: eventsWithRevenue,
      totalEvents: vendor.events.length,
      totalTicketsSold: ticketsSold._sum.sold ?? 0,
      totalRevenue: revenueKobo._sum.subtotal ?? 0,
      walletBalance: vendor.wallet?.balance ?? 0,
    };
  }

  async getAdminVendors(query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { role: 'VENDOR', isDeleted: false };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { vendorProfile: { brandName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          vendorProfile: true,
          wallet: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Attach total revenue per vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (v) => {
        const [ticketsSold, revenueKobo] = await Promise.all([
          this.prisma.ticketTier.aggregate({
            where: { event: { createdById: v.id } },
            _sum: { sold: true },
          }),
          this.prisma.order.aggregate({
            where: { event: { createdById: v.id }, status: 'PAID' },
            _sum: { subtotal: true },
          }),
        ]);
        const { password, refreshToken, ...safe } = v as any;
        return {
          ...safe,
          totalEvents: v._count.events,
          totalTicketsSold: ticketsSold._sum.sold ?? 0,
          totalRevenue: revenueKobo._sum.subtotal ?? 0,
          walletBalance: v.wallet?.balance ?? 0,
        };
      }),
    );

    return {
      data: vendorsWithStats,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
