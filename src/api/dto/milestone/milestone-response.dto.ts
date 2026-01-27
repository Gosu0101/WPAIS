import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneType } from '../../../scheduling/entities';

export class MilestoneResponseDto {
  @ApiProperty({ description: '마일스톤 ID' })
  id: string;

  @ApiProperty({ description: '마일스톤 이름' })
  name: string;

  @ApiProperty({ description: '마일스톤 타입', enum: MilestoneType })
  type: MilestoneType;

  @ApiProperty({ description: '목표일' })
  targetDate: Date;

  @ApiProperty({ description: '완료 여부' })
  isCompleted: boolean;

  @ApiPropertyOptional({ description: '완료일' })
  completedAt?: Date | null;

  static fromEntity(entity: {
    id: string;
    name: string;
    type: MilestoneType;
    targetDate: Date;
    isCompleted: boolean;
    completedAt?: Date | null;
  }): MilestoneResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      targetDate: entity.targetDate,
      isCompleted: entity.isCompleted,
      completedAt: entity.completedAt,
    };
  }
}
