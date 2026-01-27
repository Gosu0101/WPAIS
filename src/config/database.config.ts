import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Project, Episode, Milestone } from '../scheduling/entities';
import { Page } from '../workflow/entities';
import { Alert, ProgressSnapshot } from '../monitor/entities';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const isTest = configService.get('NODE_ENV') === 'test';

  // 테스트 환경에서는 SQLite 인메모리 사용
  if (isTest) {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [Project, Episode, Milestone, Page, Alert, ProgressSnapshot],
      synchronize: true,
      dropSchema: true,
    };
  }

  // 개발/프로덕션 환경에서는 PostgreSQL 사용
  return {
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: configService.get<number>('DATABASE_PORT', 5432),
    username: configService.get<string>('DATABASE_USER', 'postgres'),
    password: configService.get<string>('DATABASE_PASSWORD', ''),
    database: configService.get<string>('DATABASE_NAME', 'wpais_db'),
    entities: [Project, Episode, Milestone, Page, Alert, ProgressSnapshot],
    synchronize: false, // 프로덕션에서는 마이그레이션 사용
    logging: !isProduction,
    // 연결 풀링 설정
    poolSize: configService.get<number>('DATABASE_POOL_SIZE', 10),
    connectTimeoutMS: configService.get<number>(
      'DATABASE_CONNECT_TIMEOUT',
      10000,
    ),
    // 재시도 설정
    retryAttempts: 3,
    retryDelay: 1000,
    // SSL 설정 (프로덕션에서 필요시)
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
};

export const entities = [
  Project,
  Episode,
  Milestone,
  Page,
  Alert,
  ProgressSnapshot,
];
