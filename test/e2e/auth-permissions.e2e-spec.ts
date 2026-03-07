import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/api/filters';
import { ProjectMember, NotificationSetting } from '../../src/notification/entities';
import { MemberRole, NotificationType } from '../../src/notification/types';
import { TaskType } from '../../src/workflow/types';
import { createFutureDate } from '../utils/test-factories';

describe('E2E: Auth Permissions', () => {
  let app: INestApplication;
  let module: TestingModule;
  let memberRepository: Repository<ProjectMember>;
  let settingRepository: Repository<NotificationSetting>;
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

    memberRepository = module.get(getRepositoryToken(ProjectMember));
    settingRepository = module.get(getRepositoryToken(NotificationSetting));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const nextUser = () => {
    userSeq += 1;
    return {
      email: `user${userSeq}@example.com`,
      name: `User ${userSeq}`,
      password: 'Password1',
    };
  };

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const dateRange = () => ({
    startDate: new Date('2025-01-01').toISOString(),
    endDate: new Date('2027-12-31').toISOString(),
  });

  async function registerAndLogin() {
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
      })
      .expect(200);

    return {
      token: loginResponse.body.accessToken as string,
      user: loginResponse.body.user as {
        id: string;
        email: string;
        name: string;
        systemRole: string;
      },
    };
  }

  async function createProject(token: string, title: string) {
    const response = await request(app.getHttpServer())
      .post('/api/projects')
      .set(authHeader(token))
      .send({
        title,
        launchDate: createFutureDate(180).toISOString(),
        episodeCount: 10,
      })
      .expect(201);

    return response.body as { id: string; title: string };
  }

  function addMember(
    token: string,
    projectId: string,
    userId: string,
    role: MemberRole,
    taskType?: TaskType,
  ) {
    return request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set(authHeader(token))
      .send({ userId, role, taskType });
  }

  it('should reject non-members from project-scoped monitor, calendar, and notification settings endpoints', async () => {
    const pd = await registerAndLogin();
    const outsider = await registerAndLogin();
    const project = await createProject(pd.token, 'Protected Project');

    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/dashboard`)
      .set(authHeader(outsider.token))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/calendar/events`)
      .set(authHeader(outsider.token))
      .query(dateRange())
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/notification-settings`)
      .set(authHeader(outsider.token))
      .expect(403);
  });

  it('should prevent workers from managing project members', async () => {
    const pd = await registerAndLogin();
    const worker = await registerAndLogin();
    const candidate = await registerAndLogin();
    const project = await createProject(pd.token, 'Member Guard Project');

    await addMember(
      pd.token,
      project.id,
      worker.user.id,
      MemberRole.WORKER,
      TaskType.COLORING,
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/members`)
      .set(authHeader(worker.token))
      .send({
        userId: candidate.user.id,
        role: MemberRole.WORKER,
        taskType: TaskType.LINE_ART,
      })
      .expect(403);

    const workerMembership = await memberRepository.findOneOrFail({
      where: { projectId: project.id, userId: worker.user.id },
    });

    await request(app.getHttpServer())
      .patch(`/api/projects/${project.id}/members/${workerMembership.id}`)
      .set(authHeader(worker.token))
      .send({ role: MemberRole.PD })
      .expect(403);
  });

  it('should always use the authenticated user for notification settings', async () => {
    const pd = await registerAndLogin();
    const worker = await registerAndLogin();
    const project = await createProject(pd.token, 'Notification Settings Project');

    await addMember(
      pd.token,
      project.id,
      worker.user.id,
      MemberRole.WORKER,
      TaskType.BACKGROUND,
    ).expect(201);

    await request(app.getHttpServer())
      .patch(`/api/projects/${project.id}/notification-settings`)
      .set(authHeader(pd.token))
      .query({ userId: worker.user.id })
      .send({
        enabledTypes: [NotificationType.TASK_COMPLETED],
      })
      .expect(200);

    const workerSettingsResponse = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/notification-settings`)
      .set(authHeader(worker.token))
      .query({ userId: pd.user.id })
      .expect(200);

    expect(workerSettingsResponse.body.data.userId).toBe(worker.user.id);
    expect(workerSettingsResponse.body.data.userId).not.toBe(pd.user.id);
    expect(workerSettingsResponse.body.data.enabledTypes).toContain(
      NotificationType.TASK_STARTED,
    );

    const pdSetting = await settingRepository.findOneOrFail({
      where: { projectId: project.id, userId: pd.user.id },
    });
    expect(pdSetting.enabledTypes).toEqual([NotificationType.TASK_COMPLETED]);
  });

  it('should filter global calendar data to projects accessible by the current user', async () => {
    const ownerA = await registerAndLogin();
    const ownerB = await registerAndLogin();
    const projectA = await createProject(ownerA.token, 'Calendar Project A');
    const projectB = await createProject(ownerB.token, 'Calendar Project B');

    const response = await request(app.getHttpServer())
      .get('/api/calendar/events')
      .set(authHeader(ownerA.token))
      .query({
        ...dateRange(),
        projectIds: [projectA.id, projectB.id],
      })
      .expect(200);

    expect(response.body.projects).toHaveLength(1);
    expect(response.body.projects[0].id).toBe(projectA.id);

    const eventProjectIds = new Set(
      response.body.events.map((event: { projectId: string }) => event.projectId),
    );
    expect([...eventProjectIds]).toEqual([projectA.id]);
  });

  it('should reject invalid notification and calendar query parameters', async () => {
    const user = await registerAndLogin();

    await request(app.getHttpServer())
      .get('/api/notifications')
      .set(authHeader(user.token))
      .query({ projectId: 'not-a-uuid' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/calendar/events')
      .set(authHeader(user.token))
      .query({
        ...dateRange(),
        types: ['invalid-type'],
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/calendar/events/00000000-0000-0000-0000-000000000000/reschedule')
      .set(authHeader(user.token))
      .send({
        newDate: new Date('2026-01-10').toISOString(),
        eventType: 'invalid-type',
      })
      .expect(400);
  });
});
