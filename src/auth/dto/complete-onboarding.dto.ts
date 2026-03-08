import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @IsIn(['user', 'vendor'])
  accountType: 'user' | 'vendor';

  @IsArray()
  @IsOptional()
  interests?: string[];

  @ValidateIf((o) => o.accountType === 'vendor')
  @IsString()
  brandName?: string;

  @IsString()
  @IsOptional()
  brandBio?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  instagram?: string;
}
