import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Project, Episode, Milestone } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { ProjectController } from '../../src/api/controllers/project.controller';
import { PageController } from '../../src/api/controllers/page.controller';
import { ProjectManagerService, VelocityConfigService, SchedulerService } from '../../src/scheduling/services';
import { WorkflowEngineService } from '../../src/workflow/services';
import { HttpExceptionFilter } from '../../src/api/filters';
import { createFutureDate } from '../utils/test-factories';
import { TaskStatus } from '../../src/workflow/types';
import { Repository } from 'typeorm';

/**
 * API E2E Tests
 * 
 * Note: Monitor API tests are excluded because AlertService requires
 * Alert entity with jsonb type which SQLite doesn't support.
 * Monitor API functionality is tested in workflow-monitor.integration.spec.ts
 */
describe('API E2E Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let pageRepository: Repository<Page>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Project, Episode, Milestone, Page],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
        EventEmitterModule.forRoot(),
      ],
      controllers: [ProjectController, PageController],
      providers: [
        {
          provide: VelocityConfigService,
          useFactory: () => new VelocityConfigService(),
        },
        SchedulerService,
        ProjectManagerService,
        WorkflowEngineService,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    pageRepository = module.get('PageRepository');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Project API E2E (Task 13.1)', () => {
    let createdProjectId: string;

    /**
     * Requirements: 1.1
     * POST /api/projects → GET /api/projects/:id 플로우
     */
    it('POST /api/projects - 프로젝트 생성', async () => {
      const launchDate = createFutureDate(180);
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          title: 'Test Webtoon',
          launchDate: launchDate.toISOString(),
          episodeCount: 10,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Webtoon');
      expect(response.body).toHaveProperty('sealDate');
      expect(response.body).toHaveProperty('productionStartDate');
      expect(response.body).toHaveProperty('velocityConfig');

      createdProjectId = response.body.id;
    });

    it('GET /api/projects/:id - 프로젝트 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${createdProjectId}`)
        .expect(200);

      expect(response.body.id).toBe(createdProjectId);
      expect(response.body.title).toBe('Test Webtoon');
    });

    it('GET /api/projects - 프로젝트 목록 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    /**
     * Requirements: 5.1
     * PATCH /api/projects/:id 재계산 검증
     */
    it('PATCH /api/projects/:id - 런칭일 변경 시 스케줄 재계산', async () => {
      const originalResponse = await request(app.getHttpServer())
        .get(`/api/projects/${createdProjectId}`)
        .expect(200);

      const originalSealDate = new Date(originalResponse.body.sealDate);

      // 런칭일을 2주 앞당김
      const newLaunchDate = createFutureDate(166);
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/projects/${createdProjectId}`)
        .send({
          launchDate: newLaunchDate.toISOString(),
        })
        .expect(200);

      const newSealDate = new Date(updateResponse.body.sealDate);
      expect(newSealDate.getTime()).toBeLessThan(originalSealDate.getTime());
    });

    it('GET /api/projects/:id - 존재하지 않는 프로젝트 조회 시 404', async () => {
      await request(app.getHttpServer())
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('POST /api/projects - 잘못된 데이터로 생성 시 400', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          title: '', // 빈 제목
          launchDate: 'invalid-date',
          episodeCount: -1,
        })
        .expect(400);
    });
  });

  describe('Workflow API E2E (Task 13.2)', () => {
    let pageId: string;

    beforeAll(async () => {
      // 프로젝트 생성
      const projectResponse = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          title: 'Workflow Test Webtoon',
          launchDate: createFutureDate(180).toISOString(),
          episodeCount: 5,
        })
        .expect(201);

      const projectId = projectResponse.body.id;

      // 페이지 초기화를 위해 WorkflowEngineService 직접 사용
      const workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
      const projectManager = module.get<ProjectManagerService>(ProjectManagerService);
      const project = await projectManager.getProject(projectId);
      const episode = project!.episodes[0];
      
      const pages = workflowEngine.initializePages(episode.id, 5);
      
      // 페이지 저장 - UUID 형식으로 ID 재생성
      const { v4: uuidv4 } = await import('uuid');
      for (const page of pages) {
        page.id = uuidv4(); // UUID 형식으로 변경
        await pageRepository.save(page);
      }
      
      pageId = pages[0].id;
    });

    /**
     * Requirements: 2.1
     * POST /api/pages/:id/tasks/:type/start → complete 플로우
     */
    it('POST /api/pages/:pageId/tasks/BACKGROUND/start - 작업 시작', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/pages/${pageId}/tasks/BACKGROUND/start`)
        .expect(201);

      expect(response.body.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);
    });

    it('POST /api/pages/:pageId/tasks/BACKGROUND/complete - 작업 완료', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/pages/${pageId}/tasks/BACKGROUND/complete`)
        .expect(201);

      expect(response.body.backgroundStatus).toBe(TaskStatus.DONE);
      expect(response.body.lineArtStatus).toBe(TaskStatus.READY); // 다음 공정 잠금 해제
    });

    /**
     * Requirements: 6.1
     * 상태 전이 오류 응답 검증
     */
    it('POST /api/pages/:pageId/tasks/BACKGROUND/start - 이미 완료된 작업 시작 시 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/pages/${pageId}/tasks/BACKGROUND/start`)
        .expect(400);
    });

    /**
     * Requirements: 6.2
     * 의존성 미충족 오류 응답 검증
     * COLORING은 LOCKED 상태이므로 시작 시 400 (InvalidStateTransition)
     */
    it('POST /api/pages/:pageId/tasks/COLORING/start - LOCKED 상태에서 시작 시 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/pages/${pageId}/tasks/COLORING/start`)
        .expect(400);
    });

    it('GET /api/pages/:id - 페이지 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/pages/${pageId}`)
        .expect(200);

      expect(response.body.id).toBe(pageId);
      expect(response.body).toHaveProperty('backgroundStatus');
      expect(response.body).toHaveProperty('lineArtStatus');
    });

    it('POST /api/pages/:pageId/tasks/INVALID/start - 잘못된 작업 유형 시 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/pages/${pageId}/tasks/INVALID/start`)
        .expect(400);
    });
  });
});
