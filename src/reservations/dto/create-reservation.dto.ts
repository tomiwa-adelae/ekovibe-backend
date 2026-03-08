import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  venueId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // ISO date string

  @IsString()
  @IsNotEmpty()
  time: string; // e.g. "19:30"

  @IsInt()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
