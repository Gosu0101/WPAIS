---
inclusion: fileMatch
fileMatchPattern: "**/*.entity.ts"
---

# Entity & DTO 패턴 가이드

TypeORM 엔티티 및 NestJS DTO 작성 시 자동으로 적용되는 가이드라인입니다.

## TypeORM 엔티티 패턴

### 기본 구조
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('table_name')
export class EntityName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 관계 설정 패턴

#### One-to-Many / Many-to-One
```typescript
// Parent (One side)
@Entity()
export class Project {
  @OneToMany(() => Task, task => task.project, { cascade: true })
  tasks: Task[];
}

// Child (Many side)
@Entity()
export class Task {
  @ManyToOne(() => Project, project => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;
}
```

#### Many-to-Many
```typescript
@Entity()
export class Task {
  @ManyToMany(() => Resource, resource => resource.tasks)
  @JoinTable({
    name: 'task_resources',
    joinColumn: { name: 'task_id' },
    inverseJoinColumn: { name: 'resource_id' }
  })
  resources: Resource[];
}
```

### Enum 컬럼
```typescript
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity()
export class Task {
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;
}
```

### JSON 컬럼
```typescript
@Entity()
export class Project {
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

### 인덱스 설정
```typescript
@Entity()
@Index(['projectId', 'status'])
@Index(['dueDate'])
export class Task {
  // ...
}
```

## DTO 패턴 (class-validator)

### Create DTO
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: '태스크 이름', example: '콘티 작업' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '프로젝트 ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.PENDING })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}
```

### Update DTO (PartialType 활용)
```typescript
import { PartialType } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
```

### Response DTO
```typescript
import { Exclude, Expose, Type } from 'class-transformer';

export class TaskResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  status: TaskStatus;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @Exclude()
  internalField: string; // 응답에서 제외
}
```

### Query DTO (필터/페이지네이션)
```typescript
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

## 검증 데코레이터 참조

### 문자열
| 데코레이터 | 용도 |
|-----------|------|
| `@IsString()` | 문자열 타입 |
| `@IsNotEmpty()` | 빈 문자열 불가 |
| `@MinLength(n)` | 최소 길이 |
| `@MaxLength(n)` | 최대 길이 |
| `@Matches(regex)` | 정규식 매칭 |
| `@IsEmail()` | 이메일 형식 |
| `@IsUrl()` | URL 형식 |

### 숫자
| 데코레이터 | 용도 |
|-----------|------|
| `@IsNumber()` | 숫자 타입 |
| `@IsInt()` | 정수 |
| `@Min(n)` | 최소값 |
| `@Max(n)` | 최대값 |
| `@IsPositive()` | 양수 |

### 날짜
| 데코레이터 | 용도 |
|-----------|------|
| `@IsDate()` | 날짜 타입 |
| `@IsDateString()` | ISO 날짜 문자열 |
| `@MinDate(date)` | 최소 날짜 |
| `@MaxDate(date)` | 최대 날짜 |

### 기타
| 데코레이터 | 용도 |
|-----------|------|
| `@IsUUID()` | UUID 형식 |
| `@IsEnum(enum)` | Enum 값 |
| `@IsArray()` | 배열 |
| `@IsBoolean()` | 불리언 |
| `@IsOptional()` | 선택적 필드 |
| `@ValidateNested()` | 중첩 객체 검증 |

## WPAIS 프로젝트 엔티티 체크리스트

### 엔티티 작성 시
- [ ] `@Entity()` 데코레이터에 테이블명 명시
- [ ] UUID 기본키 사용
- [ ] `createdAt`, `updatedAt` 포함
- [ ] 관계 설정 시 cascade/onDelete 명시
- [ ] 필요한 인덱스 설정
- [ ] 컬럼 타입 명시적 지정

### DTO 작성 시
- [ ] 모든 필드에 검증 데코레이터
- [ ] Swagger 문서화 (`@ApiProperty`)
- [ ] Optional 필드 명시
- [ ] 적절한 기본값 설정
