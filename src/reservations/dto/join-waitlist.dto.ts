import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';

export class JoinWaitlistDto {
  @IsString()
  @IsNotEmpty()
  venueSlug: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsDateString()
  date: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'timeSlot must be HH:MM' })
  timeSlot: string;

  @IsInt()
  @Min(1)
  @Max(50)
  partySize: number;
}
