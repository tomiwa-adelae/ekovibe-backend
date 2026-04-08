import { IsEmail } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;
}
