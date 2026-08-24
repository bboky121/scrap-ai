import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PlanCode } from '../../generated/prisma/client';

export class SimulatePaymentDto {
  @IsEnum(PlanCode)
  planCode!: PlanCode;

  @IsEnum(['success', 'failure'])
  result!: 'success' | 'failure';

  @IsOptional()
  @IsString()
  @Length(4, 32)
  cardLast4?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
