import { VelocityConfig } from './velocity-config.type';

/**
 * CreateProjectInput - 프로젝트 생성 입력 타입
 */
export interface CreateProjectInput {
  /** 작품명 */
  title: string;
  
  /** 런칭 목표일 */
  launchDate: Date;
  
  /** 런칭 시 확보할 회차 수 (기본값: 10) */
  episodeCount?: number;
  
  /** 가중치 설정 (선택적, 기본값 사용 가능) */
  velocityConfig?: VelocityConfig;
}
