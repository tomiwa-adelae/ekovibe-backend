import { IsString, IsNotEmpty, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator';
import { VaultPaymentMethod } from 'generated/prisma/client';

export class PlaceOrderDto {
  @IsEnum(VaultPaymentMethod) paymentMethod: VaultPaymentMethod;
  @IsString() @IsNotEmpty() recipientName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() addressLine: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() state: string;
  @IsOptional() @IsString() note?: string;
}
