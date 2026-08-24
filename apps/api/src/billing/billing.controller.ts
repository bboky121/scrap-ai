import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { BillingService } from './billing.service';
import { AutoRenewDto } from './dto/auto-renew.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@Controller()
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing = new BillingService(prisma),
  ) {}
  @Get('plans') plans() {
    return this.billing.plans();
  }

  @UseGuards(AuthenticatedGuard)
  @Post('payments/simulate')
  async pay(@Req() req: Request, @Body() body: SimulatePaymentDto) {
    return this.billing.pay(req, body);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('subscriptions/me')
  async mine(@Req() req: Request) {
    return this.billing.mine(req);
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('subscriptions/me/auto-renew')
  async renew(@Req() req: Request, @Body() body: AutoRenewDto) {
    return this.billing.renew(req, body);
  }

  @UseGuards(AuthenticatedGuard)
  @Post('subscriptions/me/cancel')
  async cancel(@Req() req: Request) {
    return this.billing.cancel(req);
  }
}
