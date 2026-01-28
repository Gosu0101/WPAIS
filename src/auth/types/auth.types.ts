/**
 * 시스템 역할 enum
 * ADMIN: 시스템 관리자 - 모든 리소스 접근 가능
 * USER: 일반 사용자 - 자신이 속한 프로젝트만 접근 가능
 */
export enum SystemRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * JWT Access Token Payload
 */
export interface JwtPayload {
  sub: string;        // userId
  email: string;
  systemRole: SystemRole;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * JWT Refresh Token Payload
 */
export interface RefreshTokenPayload {
  sub: string;        // userId
  tokenId: string;    // refresh_tokens.id
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    systemRole: SystemRole;
  };
}

/**
 * 회원가입 요청 타입
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * 로그인 요청 타입
 */
export interface LoginRequest {
  email: string;
  password: string;
}
