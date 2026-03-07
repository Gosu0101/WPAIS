import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../types';
import { getJwtAlgorithm, getJwtKeyConfig } from '../utils/jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const algorithm = getJwtAlgorithm(configService);
    const keyConfig = getJwtKeyConfig(configService);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: keyConfig.verifyKey,
      algorithms: [algorithm],
    });
  }

  /**
   * JWT 토큰 검증 후 호출됩니다.
   * 사용자 정보를 반환하여 request.user에 저장됩니다.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // 사용자 존재 및 활성화 상태 확인
    const user = await this.authService.findUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      systemRole: payload.systemRole,
    };
  }
}
