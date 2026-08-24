import { IsBoolean } from 'class-validator';

export class AutoRenewDto {
  @IsBoolean()
  autoRenew!: boolean;
}
