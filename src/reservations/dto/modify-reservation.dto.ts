import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  Matches,
} from 'class-validator';

export class ModifyReservationDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'timeSlot must be HH:MM' })
  @IsOptional()
  timeSlot?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  partySize?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  spaceIds?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  specialRequests?: string;
}
