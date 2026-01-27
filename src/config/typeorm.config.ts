import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// 엔티티 경로 (CLI에서는 glob 패턴 사용)
const entities = ['src/**/*.entity.ts'];
const migrations = ['src/migrations/*.ts'];

const isProduction = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'wpais_db',
  entities,
  migrations,
  synchronize: false,
  logging: !isProduction,
  // 연결 풀링 설정
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  connectTimeoutMS: parseInt(
    process.env.DATABASE_CONNECT_TIMEOUT || '10000',
    10,
  ),
};

// TypeORM CLI용 DataSource 인스턴스
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
