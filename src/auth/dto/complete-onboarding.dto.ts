import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @IsIn(['user', 'vendor', 'venue_owner'])
  accountType: 'user' | 'vendor' | 'venue_owner';

  @IsArray()
  @IsOptional()
  interests?: string[];

  // ── Vendor fields ─────────────────────────────────────────────────────────
  @ValidateIf((o) => o.accountType === 'vendor')
  @IsString()
  brandName?: string;

  @IsString()
  @IsOptional()
  brandBio?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  // ── Venue owner fields ────────────────────────────────────────────────────
  @ValidateIf((o) => o.accountType === 'venue_owner')
  @IsString()
  businessName?: string;

  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @IsString()
  @IsOptional()
  businessPhone?: string;
}
