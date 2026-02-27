import { IsString, IsNotEmpty } from 'class-validator';

export class ScanTicketDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
