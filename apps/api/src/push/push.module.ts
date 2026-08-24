import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { FcmService } from './fcm.service';
import { InternalServiceGuard } from './internal-service.guard';

@Module({
  controllers: [PushController],
  providers: [PushService, FcmService, InternalServiceGuard],
})
export class PushModule {}
