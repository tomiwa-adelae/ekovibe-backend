import { IsOptional, IsString, IsEnum, IsInt, Min, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EventCategory, EventStatus } from 'generated/prisma/client';

export class EventQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsIn(['date_asc', 'date_desc'])
  sortBy?: 'date_asc' | 'date_desc';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
