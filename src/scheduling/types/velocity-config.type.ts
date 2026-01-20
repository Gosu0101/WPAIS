/**
 * VelocityConfig - 회차별 제작 기간 가중치 설정
 * 
 * 적응 가속도(Adaptive Learning Curve) 로직을 위한 설정입니다.
 * - 적응기(Learning Period): 1~10화, 회차당 14일
 * - 정상기(Normal Period): 11화 이후, 회차당 7일
 */
export interface VelocityConfig {
  /** 적응기 종료 회차 (기본값: 10) */
  learningPeriodEnd: number;
  
  /** 적응기 회차당 제작 기간 (일 단위, 기본값: 14) */
  learningPeriodDuration: number;
  
  /** 정상기 회차당 제작 기간 (일 단위, 기본값: 7) */
  normalPeriodDuration: number;
}

/**
 * 기본 VelocityConfig 값을 반환합니다.
 */
export function getDefaultVelocityConfig(): VelocityConfig {
  return {
    learningPeriodEnd: 10,
    learningPeriodDuration: 14,
    normalPeriodDuration: 7,
  };
}

/**
 * VelocityConfig를 JSON 문자열로 직렬화합니다.
 */
export function serializeVelocityConfig(config: VelocityConfig): string {
  return JSON.stringify(config);
}

/**
 * JSON 문자열을 VelocityConfig로 역직렬화합니다.
 */
export function deserializeVelocityConfig(json: string): VelocityConfig {
  const parsed = JSON.parse(json);
  return {
    learningPeriodEnd: parsed.learningPeriodEnd,
    learningPeriodDuration: parsed.learningPeriodDuration,
    normalPeriodDuration: parsed.normalPeriodDuration,
  };
}
