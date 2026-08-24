import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.header('x-internal-service-token') !== (process.env.INTERNAL_SERVICE_TOKEN ?? 'change-me')) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
