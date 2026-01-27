import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Page } from './entities/page.entity';
import { WorkflowEngineService } from './services/workflow-engine.service';

/**
 * WorkflowModule
 * 웹툰 제작의 페이지 단위 작업 관리와 스테이지 퍼스트 의존성 기반의 공정 릴레이 로직을 담당
 * 
 * 주요 기능:
 * - Page 엔티티 관리
 * - 스테이지 퍼스트 의존성 검증
 * - 자동 잠금 해제 (Auto-Unlock)
 * - 에피소드 진행률 계산
 * - 이벤트 발행 (TaskUnlockedEvent, EpisodeCompletedEvent)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Page]),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    WorkflowEngineService,
  ],
  exports: [
    WorkflowEngineService,
    TypeOrmModule.forFeature([Page]),
  ],
})
export class WorkflowModule {}
