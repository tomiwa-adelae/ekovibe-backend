import {
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { DepositType } from 'generated/prisma/client';

export class SetPolicyDto {
  @IsEnum(DepositType)
  depositType: DepositType;

  @ValidateIf((o) => o.depositType === 'FLAT')
  @IsInt()
  @Min(0)
  depositAmount?: number; // in kobo

  @ValidateIf((o) => o.depositType === 'PERCENTAGE_OF_MIN_SPEND')
  @IsInt()
  @Min(1)
  @Max(100)
  depositPercent?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  fullRefundHoursThreshold?: number; // e.g. 48

  @IsInt()
  @Min(0)
  @IsOptional()
  partialRefundHoursThreshold?: number; // e.g. 24

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  partialRefundPercent?: number; // e.g. 50

  @IsInt()
  @Min(0)
  @IsOptional()
  modificationAllowedHoursBefore?: number;
}
