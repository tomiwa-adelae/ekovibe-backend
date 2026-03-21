import { IsString, IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @IsString() variantId: string;
  @IsInt() @Min(1) quantity: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(1) quantity: number;
}

export class DeliveryZoneDto {
  @IsString() state: string;
  @IsInt() @Min(0) fee: number;
}
