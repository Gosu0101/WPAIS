import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common';

export class ProjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '작품명 검색' })
  @IsOptional()
  @IsString()
  title?: string;
}
