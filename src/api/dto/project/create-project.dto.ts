import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsDateString, IsOptional, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { VelocityConfigDto } from './velocity-config.dto';

export class CreateProjectDto {
  @ApiProperty({ description: '작품명', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '런칭 목표일 (ISO 8601 형식)', example: '2025-06-01' })
  @IsDateString()
  launchDate: string;

  @ApiPropertyOptional({ description: '런칭 시 확보할 회차 수', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  episodeCount?: number;

  @ApiPropertyOptional({ description: '가중치 설정', type: VelocityConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VelocityConfigDto)
  velocityConfig?: VelocityConfigDto;
}
