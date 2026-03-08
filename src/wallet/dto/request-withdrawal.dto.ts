import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsInt()
  @Min(100000) // minimum ₦1,000 (in kobo)
  amount: number;

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
