import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../../../workflow/types';

export class PageResponseDto {
  @ApiProperty({ description: '페이지 ID' })
  id: string;

  @ApiProperty({ description: '페이지 번호' })
  pageNumber: number;

  @ApiProperty({ description: '높이 (px)' })
  heightPx: number;

  @ApiProperty({ description: '배경 작업 상태', enum: TaskStatus })
  backgroundStatus: TaskStatus;

  @ApiProperty({ description: '선화 작업 상태', enum: TaskStatus })
  lineArtStatus: TaskStatus;

  @ApiProperty({ description: '채색 작업 상태', enum: TaskStatus })
  coloringStatus: TaskStatus;

  @ApiProperty({ description: '후보정 작업 상태', enum: TaskStatus })
  postProcessingStatus: TaskStatus;

  static fromEntity(entity: {
    id: string;
    pageNumber: number;
    heightPx: number;
    backgroundStatus: TaskStatus;
    lineArtStatus: TaskStatus;
    coloringStatus: TaskStatus;
    postProcessingStatus: TaskStatus;
  }): PageResponseDto {
    return {
      id: entity.id,
      pageNumber: entity.pageNumber,
      heightPx: entity.heightPx,
      backgroundStatus: entity.backgroundStatus,
      lineArtStatus: entity.lineArtStatus,
      coloringStatus: entity.coloringStatus,
      postProcessingStatus: entity.postProcessingStatus,
    };
  }
}
