import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import session = require('express-session');
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { DiscordService } from './discord.service';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redis = new Redis(process.env.VALKEY_URL ?? 'redis://localhost:6379/0');
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true });
  app.use(session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET ?? 'development-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400_000 },
  }));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter(app.get(DiscordService)));
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}
bootstrap();
