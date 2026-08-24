import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class NotifyBriefingDto {
  @IsString()
  @MinLength(1)
  briefingId!: string;

  @IsString()
  @MinLength(1)
  hour!: string;

  @IsInt()
  @Min(1)
  articleCount!: number;
}
