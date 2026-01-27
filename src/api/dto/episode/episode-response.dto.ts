import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeStatus } from '../../../scheduling/entities';
import { PageResponseDto } from '../page';

export class EpisodeResponseDto {
  @ApiProperty({ description: '에피소드 ID' })
  id: string;

  @ApiProperty({ description: '에피소드 번호' })
  episodeNumber: number;

  @ApiProperty({ description: '마감일' })
  dueDate: Date;

  @ApiProperty({ description: '제작 기간 (일)' })
  duration: number;

  @ApiProperty({ description: '상태', enum: EpisodeStatus })
  status: EpisodeStatus;

  @ApiProperty({ description: '봉인 대상 여부' })
  isSealed: boolean;

  static fromEntity(entity: {
    id: string;
    episodeNumber: number;
    dueDate: Date;
    duration: number;
    status: EpisodeStatus;
    isSealed: boolean;
  }): EpisodeResponseDto {
    return {
      id: entity.id,
      episodeNumber: entity.episodeNumber,
      dueDate: entity.dueDate,
      duration: entity.duration,
      status: entity.status,
      isSealed: entity.isSealed,
    };
  }
}

export class EpisodeDetailResponseDto extends EpisodeResponseDto {
  @ApiPropertyOptional({ description: '페이지 목록', type: [PageResponseDto] })
  pages?: PageResponseDto[];

  static fromEntityWithPages(
    entity: {
      id: string;
      episodeNumber: number;
      dueDate: Date;
      duration: number;
      status: EpisodeStatus;
      isSealed: boolean;
    },
    pages: PageResponseDto[],
  ): EpisodeDetailResponseDto {
    return {
      ...EpisodeResponseDto.fromEntity(entity),
      pages,
    };
  }
}
