import { ApiProperty } from '@nestjs/swagger';
import { VelocityConfigDto } from './velocity-config.dto';

export class ProjectResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  id: string;

  @ApiProperty({ description: '작품명' })
  title: string;

  @ApiProperty({ description: '런칭 목표일' })
  launchDate: Date;

  @ApiProperty({ description: '봉인일 (런칭 7일 전)' })
  sealDate: Date;

  @ApiProperty({ description: '제작 시작일' })
  productionStartDate: Date;

  @ApiProperty({ description: '채용 시작일' })
  hiringStartDate: Date;

  @ApiProperty({ description: '기획 시작일' })
  planningStartDate: Date;

  @ApiProperty({ description: '가중치 설정', type: VelocityConfigDto })
  velocityConfig: VelocityConfigDto;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  static fromEntity(entity: {
    id: string;
    title: string;
    launchDate: Date;
    sealDate: Date;
    productionStartDate: Date;
    hiringStartDate: Date;
    planningStartDate: Date;
    velocityConfig: VelocityConfigDto;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      launchDate: entity.launchDate,
      sealDate: entity.sealDate,
      productionStartDate: entity.productionStartDate,
      hiringStartDate: entity.hiringStartDate,
      planningStartDate: entity.planningStartDate,
      velocityConfig: entity.velocityConfig,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
