import { IsIn, IsOptional, IsString, Min } from 'class-validator';

export class ArticleQueryDto {
  @IsOptional()
  @Min(1)
  page?: string;

  @IsOptional()
  @IsString()
  @IsIn(['NEWS', 'DISCLOSURE', 'MARKET_COMMENTARY'])
  kind?: string;
}
