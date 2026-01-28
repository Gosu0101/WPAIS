# 인증/권한 시스템 설계 (Authentication & Authorization System Design)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Login Page  │  │ AuthContext │  │ Protected Routes        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (NestJS)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AuthModule  │  │ JwtGuard    │  │ RolesGuard              │  │
│  │             │  │             │  │ ProjectPermissionGuard  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      AuthService                             ││
│  │  - register()  - login()  - refreshToken()  - validateUser() ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database (PostgreSQL)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   users     │  │refresh_tokens│  │   project_members       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: SystemRole.USER })
  systemRole: SystemRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum SystemRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

### RefreshToken Entity

```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  tokenHash: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | 회원가입 | No |
| POST | /api/auth/login | 로그인 | No |
| POST | /api/auth/refresh | 토큰 갱신 | Refresh Token |
| POST | /api/auth/logout | 로그아웃 | Yes |
| GET | /api/auth/me | 현재 사용자 정보 | Yes |

### Request/Response Examples

#### POST /api/auth/register
```json
// Request
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "홍길동"
}

// Response 201
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "홍길동",
  "systemRole": "USER"
}
```

#### POST /api/auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "Password123"
}

// Response 200
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "systemRole": "USER"
  }
}
// + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
```

## Security Implementation

### JWT Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;        // userId
  email: string;
  systemRole: SystemRole;
  iat: number;
  exp: number;        // 15분
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;        // userId
  tokenId: string;    // refresh_tokens.id
  iat: number;
  exp: number;        // 7일
}
```

### Password Hashing

```typescript
// bcrypt with cost factor 12
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);
```

### Guards

```typescript
// 1. JwtAuthGuard - 토큰 검증
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// 2. RolesGuard - 시스템 역할 검증
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<SystemRole[]>('roles', ...);
    const user = request.user;
    return requiredRoles.includes(user.systemRole);
  }
}

// 3. ProjectPermissionGuard - 프로젝트 권한 검증
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const projectId = request.params.projectId;
    const userId = request.user.sub;
    const requiredPermission = this.reflector.get<ProjectPermission>(...);
    
    // 프로젝트 멤버 확인 및 권한 검증
    const member = await this.memberService.findMember(projectId, userId);
    return this.hasPermission(member, requiredPermission);
  }
}
```

### Decorators

```typescript
// 역할 요구 데코레이터
@Roles(SystemRole.ADMIN)

// 프로젝트 권한 데코레이터
@ProjectPermission(Permission.MANAGE_MEMBERS)

// 현재 사용자 데코레이터
@CurrentUser() user: JwtPayload

// 공개 API 데코레이터
@Public()
```

## Permission Matrix

### System Roles

| Action | ADMIN | USER |
|--------|-------|------|
| 모든 프로젝트 조회 | ✅ | ❌ |
| 사용자 관리 | ✅ | ❌ |
| 시스템 설정 | ✅ | ❌ |
| 자신의 프로젝트 접근 | ✅ | ✅ |

### Project Roles

| Action | PD | WORKER |
|--------|-----|--------|
| 프로젝트 설정 수정 | ✅ | ❌ |
| 멤버 관리 | ✅ | ❌ |
| 모든 페이지 수정 | ✅ | ❌ |
| 담당 공정 수정 | ✅ | ✅ |
| 프로젝트 조회 | ✅ | ✅ |

## Frontend Integration

### AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

### Token Storage Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Token Storage                         │
├─────────────────────────────────────────────────────────┤
│ Access Token  → Memory (React State/Context)            │
│ Refresh Token → HttpOnly Cookie (서버에서 설정)          │
├─────────────────────────────────────────────────────────┤
│ 장점:                                                    │
│ - XSS 공격으로부터 Refresh Token 보호                    │
│ - Access Token 탈취 시 피해 최소화 (15분 만료)           │
└─────────────────────────────────────────────────────────┘
```

### API Client Interceptor

```typescript
// 요청 인터셉터 - Access Token 추가
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 401 시 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return api.request(error.config);
    }
    throw error;
  }
);
```

## Correctness Properties

### Property 1: Password Never Stored in Plain Text
```
∀ user ∈ Users:
  user.passwordHash ≠ user.originalPassword
  AND bcrypt.compare(originalPassword, passwordHash) = true
```
**Validates: Requirements 1.1**

### Property 2: Valid Token Required for Protected Endpoints
```
∀ request to protected endpoint:
  IF !hasValidAccessToken(request) THEN response.status = 401
```
**Validates: Requirements 4.1**

### Property 3: Project Access Requires Membership
```
∀ user, project:
  IF user.systemRole ≠ ADMIN AND user ∉ project.members
  THEN canAccess(user, project) = false
```
**Validates: Requirements 2.2, 3.1, 3.2**

### Property 4: Worker Can Only Modify Assigned Tasks
```
∀ worker ∈ project.members WHERE worker.role = WORKER:
  canModify(worker, task) = (task.type = worker.taskType)
```
**Validates: Requirements 3.2**

## Dependencies

### New Packages
```json
{
  "@nestjs/jwt": "^10.x",
  "@nestjs/passport": "^10.x",
  "passport": "^0.7.x",
  "passport-jwt": "^4.x",
  "bcrypt": "^5.x",
  "@types/bcrypt": "^5.x",
  "@types/passport-jwt": "^4.x"
}
```

## Migration Plan

### Phase 1: Backend Auth Module
1. User 엔티티 생성
2. AuthService 구현
3. JWT 전략 구현
4. Guards 구현

### Phase 2: API Protection
1. 기존 컨트롤러에 Guards 적용
2. ProjectPermissionGuard 연동
3. 공개 API 설정

### Phase 3: Frontend Integration
1. AuthContext 구현
2. 로그인 페이지 구현
3. API 클라이언트 인터셉터 추가
4. Protected Routes 설정

### Phase 4: Existing System Integration
1. NotificationService에 현재 사용자 연동
2. ProjectMember와 User 연결
3. 기존 API 권한 검증 추가
