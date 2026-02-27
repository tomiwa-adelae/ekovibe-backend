import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyOrderDto {
  @IsString()
  @IsNotEmpty()
  reference: string;
}
