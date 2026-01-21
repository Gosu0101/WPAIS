/**
 * ValidationWarning - 일정 검증 경고 정보
 */
export interface ValidationWarning {
  /** 경고 코드 */
  code: string;
  
  /** 경고 메시지 */
  message: string;
  
  /** 관련 날짜들 (충돌 날짜 등) */
  dates?: Date[];
}

/**
 * ValidationResult - 일정 유효성 검증 결과
 * 
 * 스케줄 검증 후 반환되는 결과 객체입니다.
 * 유효성 여부, 에러 목록, 경고 목록을 포함합니다.
 */
export interface ValidationResult {
  /** 유효성 여부 (에러가 없으면 true) */
  isValid: boolean;
  
  /** 에러 목록 (치명적인 문제) */
  errors: string[];
  
  /** 경고 목록 (주의가 필요한 문제) */
  warnings: ValidationWarning[];
}
