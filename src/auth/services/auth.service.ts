import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import {
  SystemRole,
  JwtPayload,
  RefreshTokenPayload,
  LoginResponse,
  RegisterRequest,
  LoginRequest,
} from '../types';

@Injectable()
export class AuthService {
  private readonly BCRYPT_SALT_ROUNDS = 12;
  private readonly PASSWORD_MIN_LENGTH = 8;
  private readonly PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 비밀번호를 bcrypt로 해시합니다.
   * Cost factor 12를 사용합니다.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * 비밀번호가 해시와 일치하는지 검증합니다.
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 비밀번호 유효성 검사
   * - 최소 8자
   * - 영문 + 숫자 조합 필수
   */
  validatePasswordStrength(password: string): void {
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `비밀번호는 최소 ${this.PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      );
    }
    if (!this.PASSWORD_REGEX.test(password)) {
      throw new BadRequestException(
        '비밀번호는 영문과 숫자를 모두 포함해야 합니다.',
      );
    }
  }

  /**
   * 회원가입
   */
  async register(request: RegisterRequest): Promise<Omit<User, 'passwordHash'>> {
    const { email, password, name } = request;

    // 비밀번호 유효성 검사
    this.validatePasswordStrength(password);

    // 이메일 중복 검증
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호 해시
    const passwordHash = await this.hashPassword(password);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
      systemRole: SystemRole.USER,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // passwordHash 제외하고 반환
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  /**
   * 로그인
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { email, password } = request;

    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await this.validatePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // Access Token 생성
    const accessToken = this.generateAccessToken(user);

    // Refresh Token 생성 및 저장
    await this.createRefreshToken(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
      },
    };
  }

  /**
   * 토큰 갱신 (Token Rotation 적용)
   */
  async refreshToken(refreshTokenValue: string): Promise<LoginResponse> {
    const { storedToken, user } =
      await this.validateRefreshTokenRecord(refreshTokenValue);

    // 기존 토큰 무효화 (Token Rotation)
    await this.refreshTokenRepository.update(storedToken.id, { isRevoked: true });

    // 새 Access Token 생성
    const accessToken = this.generateAccessToken(user);

    // 새 Refresh Token 생성
    await this.createRefreshToken(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
      },
    };
  }

  /**
   * Refresh Token 기반 세션 유효성 검증
   */
  async validateRefreshSession(refreshTokenValue: string): Promise<{
    id: string;
    email: string;
    name: string;
    systemRole: SystemRole;
  }> {
    const { user } = await this.validateRefreshTokenRecord(refreshTokenValue);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
    };
  }

  /**
   * 로그아웃 - Refresh Token 무효화
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * 사용자 ID로 사용자 조회
   */
  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Access Token 생성
   */
  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    return this.jwtService.sign(payload, {
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Refresh Token 생성 및 저장
   */
  async createRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiryDate(expiresIn);

    // 토큰 엔티티 먼저 생성 (ID 필요)
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      tokenHash: '', // 임시
      expiresAt,
      isRevoked: false,
    });

    const savedToken = await this.refreshTokenRepository.save(refreshTokenEntity);

    // Refresh Token 생성
    const payload = {
      sub: userId,
      tokenId: savedToken.id,
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: expiresIn as any,
    });

    // 토큰 해시 저장
    const tokenHash = await this.hashTokenForStorage(refreshToken);
    await this.refreshTokenRepository.update(savedToken.id, { tokenHash });

    return refreshToken;
  }

  /**
   * 토큰을 저장용 해시로 변환
   */
  private async hashTokenForStorage(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private async validateRefreshTokenRecord(refreshTokenValue: string): Promise<{
    payload: RefreshTokenPayload;
    storedToken: RefreshToken;
    user: User;
  }> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshTokenValue, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { id: payload.tokenId },
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh Token이 무효화되었습니다.');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh Token이 만료되었습니다.');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return { payload, storedToken, user };
  }

  /**
   * 만료 시간 계산
   */
  private calculateExpiryDate(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      // 기본값 7일
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
