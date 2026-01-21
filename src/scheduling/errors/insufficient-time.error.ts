/**
 * InsufficientTimeError - 제작 시작일이 과거인 경우 발생하는 에러
 * 
 * 런칭일을 기준으로 역산한 제작 시작일이 현재 날짜보다 과거인 경우,
 * 충분한 제작 시간이 없음을 나타냅니다.
 * 
 * @example
 * throw new InsufficientTimeError(
 *   new Date('2027-01-31'),
 *   new Date('2024-08-14'),
 *   new Date('2025-01-01')
 * );
 */
export class InsufficientTimeError extends Error {
  public readonly name = 'InsufficientTimeError';

  constructor(
    public readonly launchDate: Date,
    public readonly calculatedStartDate: Date,
    public readonly currentDate: Date,
  ) {
    super(
      `Insufficient time: Production would need to start on ${calculatedStartDate.toISOString()}, ` +
      `but current date is ${currentDate.toISOString()}. ` +
      `Launch date ${launchDate.toISOString()} is not achievable.`
    );
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InsufficientTimeError);
    }
  }
}
