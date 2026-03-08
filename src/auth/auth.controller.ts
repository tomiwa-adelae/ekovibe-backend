import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response, Request as ExpressRequest } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SetNewPasswordDto } from './dto/set-new-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Res() res: Response) {
    const { access_token, refresh_token, user } = await this.authService.login(
      req.user,
    );

    const cookieOptions = this.authService.getCookieOptions();
    const sessionMs = this.authService.getSessionMs(); // 30 days

    res.cookie('refreshToken', refresh_token, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    res.cookie('accessToken', access_token, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    return res.json({ user, message: `Welcome back, ${user.firstName}` });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerUser(
    @Body() registerUser: RegisterUserDto,
    @Res() res: Response,
  ) {
    const { access_token, refresh_token, user } =
      await this.authService.register(registerUser);

    const cookieOptions = this.authService.getCookieOptions();
    const sessionMs = this.authService.getSessionMs();

    res.cookie('refreshToken', refresh_token, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    res.cookie('accessToken', access_token, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    return res.json({ user, message: `Welcome to Ekovibe, ${user.firstName}` });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: ExpressRequest, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    const cookieOptions = this.authService.getCookieOptions();
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);

    return res.json({ message: "You've been logged out successfully" });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.sendPasswordResetOTP(forgotPasswordDto.email);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto.otp, verifyCodeDto.email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: ExpressRequest, @Res() res: Response) {
    // Only read the dedicated refresh token cookie — never fall back to the
    // access token cookie (they serve completely different purposes).
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'No refresh token found' });
    }

    const result = await this.authService.refreshTokens(refreshToken);

    if (!result) {
      // Refresh token expired, revoked, or detected as reused — force login
      const cookieOptions = this.authService.getCookieOptions();
      res.clearCookie('refreshToken', cookieOptions);
      res.clearCookie('accessToken', cookieOptions);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Session expired. Please log in again.' });
    }

    const { accessToken, newRefreshToken, user } = result;
    const cookieOptions = this.authService.getCookieOptions();
    const sessionMs = this.authService.getSessionMs();

    // Rotate both cookies — the new refresh token resets the 30-day window
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: sessionMs,
    });

    return res.json({ user });
  }

  @Post('set-new-password')
  @HttpCode(HttpStatus.OK)
  async setNewPassword(@Body() newPasswordDto: SetNewPasswordDto) {
    return this.authService.setNewPassword({
      email: newPasswordDto.email,
      otp: newPasswordDto.otp,
      newPassword: newPasswordDto.newPassword,
      confirmPassword: newPasswordDto.confirmPassword,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @CurrentUser() currentUser: any,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.authService.completeOnboarding(currentUser.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() currentUser: any,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.authService.updateProfile(currentUser.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vendor-profile')
  async getVendorProfile(@CurrentUser() currentUser: any) {
    return this.authService.getVendorProfile(currentUser.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('vendor-profile')
  @HttpCode(HttpStatus.OK)
  async updateVendorProfile(
    @CurrentUser() currentUser: any,
    @Body() dto: { brandName?: string; brandBio?: string; website?: string; instagram?: string; logoUrl?: string },
  ) {
    return this.authService.updateVendorProfile(currentUser.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() currentUser: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      currentUser.id,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  // ── Admin: vendor management ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/vendors/:id')
  getAdminVendorById(@Param('id') id: string) {
    return this.authService.getAdminVendorById(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('a/vendors')
  getAdminVendors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getAdminVendors({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
