import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './api/filters';

async function bootstrap() {
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
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
