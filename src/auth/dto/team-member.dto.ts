import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum TeamPosition {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export class AddTeamMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(TeamPosition)
  position: TeamPosition;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: string[];
}

export class UpdateTeamMemberDto {
  @IsEnum(TeamPosition)
  @IsOptional()
  position?: TeamPosition;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules?: string[];
}
