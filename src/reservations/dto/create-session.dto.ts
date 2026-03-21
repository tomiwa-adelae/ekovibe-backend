import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Matches,
  IsArray,
} from 'class-validator';
import { DayOfWeek } from 'generated/prisma/client';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime: string;

  @IsInt()
  @Min(15)
  @IsOptional()
  slotDurationMinutes?: number;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek: DayOfWeek[];
}

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  @IsOptional()
  startTime?: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  @IsOptional()
  endTime?: string;

  @IsInt()
  @Min(15)
  @IsOptional()
  slotDurationMinutes?: number;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsOptional()
  daysOfWeek?: DayOfWeek[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
