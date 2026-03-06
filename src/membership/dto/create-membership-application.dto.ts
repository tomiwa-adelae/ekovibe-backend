import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum MembershipTier {
  GOLD = 'GOLD',
  BLACK = 'BLACK',
}

export class CreateMembershipApplicationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  occupation: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsEnum(MembershipTier)
  tier: MembershipTier;

  @IsString()
  @IsOptional()
  referral?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
