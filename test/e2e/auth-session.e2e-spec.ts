import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/api/filters';

function extractRefreshToken(setCookieHeaders: string | string[] | undefined) {
  const cookieHeaders = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders
      ? [setCookieHeaders]
      : [];

  const refreshCookie = cookieHeaders.find((header) =>
    header.startsWith('refreshToken='),
  );

  if (!refreshCookie) {
    return null;
  }

  return refreshCookie.split(';')[0];
}

describe('E2E: Auth Session', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userSeq = 0;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const nextUser = () => {
    userSeq += 1;
    return {
      email: `session-user${userSeq}@example.com`,
      name: `Session User ${userSeq}`,
      password: 'Password1',
    };
  };

  async function registerAndLoginWithAgent() {
    const user = nextUser();

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(user)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.user.email).toBe(user.email);

    const refreshCookie = extractRefreshToken(loginResponse.headers['set-cookie']);
    expect(refreshCookie).toEqual(expect.stringContaining('refreshToken='));

    return {
      accessToken: loginResponse.body.accessToken as string,
      refreshCookie: refreshCookie as string,
      user: loginResponse.body.user as {
        id: string;
        email: string;
        name: string;
        systemRole: string;
      },
    };
  }

  it('should validate session with the refresh cookie issued during login', async () => {
    const { refreshCookie, user } = await registerAndLoginWithAgent();

    const sessionResponse = await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(sessionResponse.body).toEqual({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
      },
    });
  });

  it('should rotate the refresh cookie when refreshing the session', async () => {
    const { refreshCookie: initialRefreshCookie, user } =
      await registerAndLoginWithAgent();

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', initialRefreshCookie)
      .expect(200);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.user.id).toBe(user.id);

    const rotatedRefreshCookie = extractRefreshToken(
      refreshResponse.headers['set-cookie'],
    );
    expect(rotatedRefreshCookie).toEqual(expect.stringContaining('refreshToken='));
    expect(rotatedRefreshCookie).not.toBe(initialRefreshCookie);

    await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Cookie', rotatedRefreshCookie as string)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Cookie', initialRefreshCookie)
      .expect(401);
  });

  it('should revoke the refresh session on logout', async () => {
    const { accessToken, refreshCookie } = await registerAndLoginWithAgent();

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Cookie', refreshCookie)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });

  it('should reject session validation without a refresh cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/session').expect(401);
  });
});
