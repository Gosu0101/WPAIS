import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { EpisodeStatus } from '../../../scheduling/entities';

export class EpisodeQueryDto {
  @ApiPropertyOptional({ description: '상태 필터', enum: EpisodeStatus })
  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;
}
