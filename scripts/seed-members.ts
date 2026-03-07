import 'dotenv/config';
import { DataSource } from 'typeorm';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function seedMembers() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    username: getRequiredEnv('DATABASE_USER'),
    password: getRequiredEnv('DATABASE_PASSWORD'),
    database: getRequiredEnv('DATABASE_NAME'),
  });

  await ds.initialize();

  // 기존 데이터 마이그레이션용: 모든 사용자를 모든 프로젝트의 PD로 추가
  await ds.query(`
    INSERT INTO project_members (id, "projectId", "userId", role, "taskType", "createdAt")
    SELECT
      gen_random_uuid(),
      p.id,
      u.id,
      'PD',
      NULL,
      NOW()
    FROM projects p
    CROSS JOIN users u
    ON CONFLICT ("projectId", "userId", "taskType") DO NOTHING
  `);

  console.log('Members seeded successfully');
  await ds.destroy();
}

seedMembers().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
