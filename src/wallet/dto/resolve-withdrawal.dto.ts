import { IsString, IsOptional } from 'class-validator';

export class ResolveWithdrawalDto {
  @IsString()
  @IsOptional()
  note?: string;
}
