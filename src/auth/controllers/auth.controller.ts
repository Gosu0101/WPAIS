import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * 회원가입
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * 로그인 - Refresh Token을 HttpOnly 쿠키로 설정
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    // Refresh Token 생성 및 쿠키 설정
    const refreshToken = await this.authService.createRefreshToken(result.user.id);
    
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/',
    });

    return result;
  }

  /**
   * POST /api/auth/refresh
   * 토큰 갱신
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token이 없습니다.');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // 새 Refresh Token 쿠키 설정 (Token Rotation)
    const newRefreshToken = await this.authService.createRefreshToken(result.user.id);
    
    response.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  /**
   * GET /api/auth/session
   * Refresh Token 기반 세션 유효성 검증
   */
  @Public()
  @Get('session')
  async session(@Req() request: Request) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token이 없습니다.');
    }

    const user = await this.authService.validateRefreshSession(refreshToken);

    return {
      authenticated: true,
      user,
    };
  }

  /**
   * POST /api/auth/logout
   * 로그아웃
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sub);

    // 쿠키 삭제
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: '로그아웃되었습니다.' };
  }

  /**
   * GET /api/auth/me
   * 현재 사용자 정보 조회
   */
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const fullUser = await this.authService.findUserById(user.sub);
    
    if (!fullUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      systemRole: fullUser.systemRole,
    };
  }
}
