import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VelocityConfigDto } from './velocity-config.dto';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '작품명', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: '런칭 목표일 (ISO 8601 형식)', example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  launchDate?: string;

  @ApiPropertyOptional({ description: '가중치 설정', type: VelocityConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VelocityConfigDto)
  velocityConfig?: VelocityConfigDto;
}
