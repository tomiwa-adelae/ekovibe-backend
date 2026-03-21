import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { VenueCategory, BookingMode } from 'generated/prisma/client';

export class ApplyVenueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(VenueCategory)
  category: VenueCategory;

  @IsEnum(BookingMode)
  @IsOptional()
  bookingMode?: BookingMode;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsUrl()
  @IsOptional()
  website?: string;
}

export class UpdateVenueDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(VenueCategory)
  @IsOptional()
  category?: VenueCategory;

  @IsEnum(BookingMode)
  @IsOptional()
  bookingMode?: BookingMode;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsUrl()
  @IsOptional()
  website?: string;
}
