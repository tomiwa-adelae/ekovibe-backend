import { IsString, IsInt, IsOptional, IsArray, IsEnum, IsBoolean, Min } from 'class-validator';
import { ProductCategory } from 'generated/prisma/client';

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsEnum(ProductCategory) category?: ProductCategory;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
}

export class UpdateVariantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(0) price?: number | null;
  @IsOptional() @IsInt() @Min(0) stock?: number;
}

export class AddVariantDto {
  @IsString() name: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsInt() @Min(0) stock: number;
}
