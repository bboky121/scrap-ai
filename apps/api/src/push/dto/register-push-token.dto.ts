import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
