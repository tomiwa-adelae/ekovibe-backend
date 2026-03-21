import { IsString, IsInt, IsOptional, IsArray, IsEnum, IsBoolean, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from 'generated/prisma/client';

export class CreateVariantDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsInt() @Min(0) stock: number;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() description: string;
  @IsInt() @Min(0) price: number;
  @IsArray() @IsString({ each: true }) @IsOptional() images?: string[];
  @IsEnum(ProductCategory) @IsOptional() category?: ProductCategory;
  @IsBoolean() @IsOptional() isAvailable?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateVariantDto) variants: CreateVariantDto[];
}
