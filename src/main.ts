import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './api/filters';
import {
  buildLoginRateLimitKey,
  createRateLimitMiddleware,
} from './common/rate-limit/rate-limit.middleware';

function getAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];

  return Array.from(new Set([...configuredOrigins, ...defaults]));
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cookie Parser
  app.use(cookieParser());

  // Global API Prefix
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS - credentials 모드 지원
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean | string) => void,
    ) => {
      // same-origin 요청이나 서버 간 호출은 origin 헤더가 없을 수 있습니다.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  app.use(
    '/api/auth/login',
    createRateLimitMiddleware({
      id: 'auth-login',
      windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      maxRequests: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
      message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.',
      keyGenerator: buildLoginRateLimitKey,
    }),
  );

  app.use(
    '/api',
    createRateLimitMiddleware({
      id: 'api',
      windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60 * 1000),
      maxRequests: Number(process.env.API_RATE_LIMIT_MAX || 300),
      message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
      skip: (request) => request.path === '/auth/login',
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('WPAIS API')
    .setDescription('웹툰 제작 AI 지원 시스템 API')
    .setVersion('1.0')
    .addTag('projects', '프로젝트 관리')
    .addTag('episodes', '에피소드 관리')
    .addTag('pages', '페이지 워크플로우')
    .addTag('milestones', '마일스톤')
    .addTag('monitor', '모니터링')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
