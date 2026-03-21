import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsDateString,
  IsArray,
  Matches,
} from 'class-validator';

export class InitiateReservationDto {
  @IsString()
  @IsNotEmpty()
  venueSlug: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsDateString()
  date: string; // "2024-12-20"

  @Matches(/^\d{2}:\d{2}$/, { message: 'timeSlot must be HH:MM' })
  timeSlot: string; // "19:00"

  @IsInt()
  @Min(1)
  @Max(50)
  partySize: number;

  @IsArray()
  @IsString({ each: true })
  spaceIds: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  specialRequests?: string;
}
