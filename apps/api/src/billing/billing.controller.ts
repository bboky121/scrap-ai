import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { userId } from '../common/session';
import { BillingService } from './billing.service';
import { AutoRenewDto } from './dto/auto-renew.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get('plans') plans() {
    return this.billing.plans();
  }

  @UseGuards(AuthenticatedGuard)
  @Post('payments/simulate')
  pay(@Req() req: Request, @Body() body: SimulatePaymentDto) {
    return this.billing.pay(userId(req), body);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('subscriptions/me')
  mine(@Req() req: Request) {
    return this.billing.mine(userId(req));
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('subscriptions/me/auto-renew')
  renew(@Req() req: Request, @Body() body: AutoRenewDto) {
    return this.billing.renew(userId(req), body);
  }

  @UseGuards(AuthenticatedGuard)
  @Post('subscriptions/me/cancel')
  cancel(@Req() req: Request) {
    return this.billing.cancel(userId(req));
  }
}
