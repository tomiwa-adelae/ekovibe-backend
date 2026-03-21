import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { SpaceType } from 'generated/prisma/client';

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SpaceType)
  type: SpaceType;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  minSpend?: number; // in kobo

  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class UpdateSpaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SpaceType)
  @IsOptional()
  type?: SpaceType;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  minSpend?: number;

  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
