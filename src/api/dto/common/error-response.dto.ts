import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidationErrorDto {
  @ApiProperty({ description: '필드명' })
  field: string;

  @ApiProperty({ description: '오류 메시지', type: [String] })
  messages: string[];
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP 상태 코드' })
  statusCode: number;

  @ApiProperty({ description: '오류 메시지' })
  message: string;

  @ApiProperty({ description: '오류 타입' })
  error: string;

  @ApiProperty({ description: '발생 시간' })
  timestamp: string;

  @ApiProperty({ description: '요청 경로' })
  path: string;

  @ApiPropertyOptional({ description: '검증 오류 상세', type: [ValidationErrorDto] })
  details?: ValidationErrorDto[];
}
