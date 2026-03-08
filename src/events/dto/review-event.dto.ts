import { IsString, IsNotEmpty } from 'class-validator';

export class RejectEventDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
