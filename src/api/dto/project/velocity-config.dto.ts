import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class VelocityConfigDto {
  @ApiProperty({ description: '적응기 종료 회차', default: 10, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  learningPeriodEnd: number;

  @ApiProperty({ description: '적응기 회차당 제작 기간 (일)', default: 14, minimum: 1, maximum: 60 })
  @IsInt()
  @Min(1)
  @Max(60)
  learningPeriodDuration: number;

  @ApiProperty({ description: '정상기 회차당 제작 기간 (일)', default: 7, minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  normalPeriodDuration: number;
}
