import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class VelocityQueryDto {
  @ApiPropertyOptional({
    description: '트렌드 기간',
    enum: ['7d', '14d', '30d'],
    default: '7d',
  })
  @IsOptional()
  @IsIn(['7d', '14d', '30d'])
  period?: '7d' | '14d' | '30d' = '7d';
}
