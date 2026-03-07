import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        FRONTEND_URL: Joi.string().default('http://localhost:3000'),
        DATABASE_HOST: Joi.string().default('localhost'),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().default('postgres'),
        DATABASE_PASSWORD: Joi.string().default(''),
        DATABASE_NAME: Joi.string().default('wpais_db'),
        DATABASE_POOL_SIZE: Joi.number().default(10),
        DATABASE_CONNECT_TIMEOUT: Joi.number().default(10000),
        JWT_SECRET: Joi.string().default('default-secret'),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
