import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EcomOrderStatus } from 'generated/prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(EcomOrderStatus) status: EcomOrderStatus;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() note?: string;
}
