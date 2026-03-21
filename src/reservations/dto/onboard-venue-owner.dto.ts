import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class OnboardVenueOwnerDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @IsString()
  @IsOptional()
  businessPhone?: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;
}
