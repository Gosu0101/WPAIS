/**
 * InvalidEpisodeNumberError - 유효하지 않은 회차 번호인 경우 발생하는 에러
 * 
 * 회차 번호는 1 이상의 양의 정수여야 합니다.
 * 0, 음수, 또는 정수가 아닌 값이 입력된 경우 이 에러가 발생합니다.
 * 
 * @example
 * throw new InvalidEpisodeNumberError(0);
 * throw new InvalidEpisodeNumberError(-1);
 */
export class InvalidEpisodeNumberError extends Error {
  public readonly name = 'InvalidEpisodeNumberError';

  constructor(public readonly episodeNumber: number) {
    super(
      `Invalid episode number: ${episodeNumber}. Episode number must be a positive integer.`
    );
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidEpisodeNumberError);
    }
  }
}
