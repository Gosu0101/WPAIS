---
inclusion: fileMatch
fileMatchPattern: "**/*.controller.ts"
---

# API 설계 가이드

NestJS 컨트롤러 작성 시 자동으로 적용되는 REST API 설계 가이드라인입니다.

## REST API 설계 원칙

### URL 설계
```
# 리소스 중심 (명사 사용)
✅ GET    /projects
✅ GET    /projects/:id
✅ POST   /projects
✅ PATCH  /projects/:id
✅ DELETE /projects/:id

# 동사 사용 금지
❌ GET    /getProjects
❌ POST   /createProject
❌ POST   /projects/delete/:id
```

### 중첩 리소스
```
# 부모-자식 관계
GET    /projects/:projectId/tasks
POST   /projects/:projectId/tasks
GET    /projects/:projectId/tasks/:taskId

# 3단계 이상 중첩 피하기
❌ /projects/:projectId/milestones/:milestoneId/tasks/:taskId/comments
✅ /tasks/:taskId/comments
```

### HTTP 메서드
| 메서드 | 용도 | 멱등성 | 안전성 |
|--------|------|--------|--------|
| GET | 조회 | ✅ | ✅ |
| POST | 생성 | ❌ | ❌ |
| PUT | 전체 수정 | ✅ | ❌ |
| PATCH | 부분 수정 | ✅ | ❌ |
| DELETE | 삭제 | ✅ | ❌ |

## NestJS 컨트롤러 패턴

### 기본 구조
```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({ status: 200, description: '성공', type: [ProjectResponseDto] })
  async findAll(@Query() query: ProjectQueryDto): Promise<ProjectResponseDto[]> {
    return this.projectService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  @ApiParam({ name: 'id', description: '프로젝트 ID' })
  @ApiResponse({ status: 200, description: '성공', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectResponseDto> {
    return this.projectService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '프로젝트 생성' })
  @ApiResponse({ status: 201, description: '생성됨', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async create(@Body() dto: CreateProjectDto): Promise<ProjectResponseDto> {
    return this.projectService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '프로젝트 수정' })
  @ApiResponse({ status: 200, description: '성공', type: ProjectResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiResponse({ status: 204, description: '삭제됨' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectService.remove(id);
  }
}
```

## HTTP 상태 코드

### 성공 응답
| 코드 | 의미 | 사용 |
|------|------|------|
| 200 | OK | 조회, 수정 성공 |
| 201 | Created | 생성 성공 |
| 204 | No Content | 삭제 성공 |

### 클라이언트 에러
| 코드 | 의미 | 사용 |
|------|------|------|
| 400 | Bad Request | 잘못된 요청 데이터 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 충돌 (중복 등) |
| 422 | Unprocessable Entity | 검증 실패 |

### 서버 에러
| 코드 | 의미 | 사용 |
|------|------|------|
| 500 | Internal Server Error | 서버 오류 |
| 503 | Service Unavailable | 서비스 불가 |

## 에러 응답 표준화

### 에러 응답 형식
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

### 예시
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/projects",
  "details": [
    {
      "field": "name",
      "message": "name must be longer than or equal to 1 characters"
    }
  ]
}
```

### 커스텀 예외 필터
```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.name,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## 페이지네이션

### 요청
```typescript
// Query DTO
export class PaginationQueryDto {
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

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

### 응답
```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 필터링 & 검색

### 쿼리 파라미터
```
GET /tasks?status=IN_PROGRESS&assigneeId=uuid&search=콘티
GET /projects?startDate=2025-01-01&endDate=2025-12-31
```

### 필터 DTO
```typescript
export class TaskFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

## WPAIS API 체크리스트

### 컨트롤러 작성 시
- [ ] `@ApiTags()` 태그 설정
- [ ] 모든 엔드포인트에 `@ApiOperation()` 추가
- [ ] 응답 타입 `@ApiResponse()` 문서화
- [ ] 파라미터 검증 파이프 적용 (`ParseUUIDPipe` 등)
- [ ] 적절한 HTTP 상태 코드 반환
- [ ] 에러 응답 표준화

### API 설계 시
- [ ] RESTful 원칙 준수
- [ ] 일관된 URL 패턴
- [ ] 적절한 HTTP 메서드 사용
- [ ] 페이지네이션 지원
- [ ] 필터링/검색 지원
