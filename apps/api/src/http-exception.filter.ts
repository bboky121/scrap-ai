import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DiscordService } from './common/discord.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  constructor(private readonly discord: DiscordService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    if (response.headersSent) return;
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      void this.discord.error('NestJS API 오류', message, {
        method: request.method,
        path: request.originalUrl,
        status,
      });
    }
    response.status(status).json({
      statusCode: status,
      message: status >= 500 && !(exception instanceof HttpException) ? '서버 오류가 발생했습니다.' : message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
