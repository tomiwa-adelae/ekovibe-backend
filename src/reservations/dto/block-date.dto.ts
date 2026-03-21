import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class BlockDateDto {
  @IsDateString()
  date: string; // ISO date string e.g. "2024-12-25"

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  spaceId?: string; // if null, blocks entire venue
}
