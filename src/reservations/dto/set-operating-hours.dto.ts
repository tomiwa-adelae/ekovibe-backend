import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from 'generated/prisma/client';

export class OperatingHourEntryDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsBoolean()
  isClosed: boolean;

  @Matches(/^\d{2}:\d{2}$/, { message: 'openTime must be HH:MM' })
  @IsOptional()
  openTime?: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'closeTime must be HH:MM' })
  @IsOptional()
  closeTime?: string;
}

export class SetOperatingHoursDto {
  @ValidateNested({ each: true })
  @Type(() => OperatingHourEntryDto)
  hours: OperatingHourEntryDto[];
}
