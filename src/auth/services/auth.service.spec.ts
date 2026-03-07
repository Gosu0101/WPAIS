import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { SystemRole } from '../types';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));

    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123';
      const hash = await service.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('validatePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.validatePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.validatePassword('WrongPassword123', hash);
      expect(result).toBe(false);
    });
  });

  /**
   * Property 1: Password Never Stored in Plain Text
   * **Validates: Requirements 1.1**
   * 
   * ∀ user ∈ Users:
   *   user.passwordHash ≠ user.originalPassword
   *   AND bcrypt.compare(originalPassword, passwordHash) = true
   */
  describe('Property 1: Password Never Stored in Plain Text', () => {
    // 유효한 비밀번호 생성기 (영문+숫자 조합, 8자 이상)
    const validPasswordArb = fc.tuple(
      fc.string({ minLength: 4, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
      fc.string({ minLength: 4, maxLength: 10 }).filter(s => /^[0-9]+$/.test(s)),
    ).map(([letters, numbers]: [string, string]) => letters + numbers);

    it('should never store password in plain text', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          const hash = await service.hashPassword(password);
          
          // 해시는 원본 비밀번호와 달라야 함
          expect(hash).not.toBe(password);
          
          // 해시에 원본 비밀번호가 포함되어 있지 않아야 함
          expect(hash).not.toContain(password);
          
          // bcrypt 해시 형식이어야 함
          expect(hash).toMatch(/^\$2[aby]\$/);
        }),
        { numRuns: 10 },
      );
    }, 60000);

    it('should be able to verify original password against hash', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          const hash = await service.hashPassword(password);
          
          // 원본 비밀번호로 검증 가능해야 함
          const isValid = await service.validatePassword(password, hash);
          expect(isValid).toBe(true);
        }),
        { numRuns: 10 },
      );
    }, 60000);

    it('should reject wrong passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPasswordArb,
          validPasswordArb,
          async (password1, password2) => {
            // 두 비밀번호가 다른 경우만 테스트
            fc.pre(password1 !== password2);
            
            const hash = await service.hashPassword(password1);
            const isValid = await service.validatePassword(password2, hash);
            
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 10 },
      );
    }, 60000);

    it('should store hashed password in user entity during registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          validPasswordArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (email, password, name) => {
            mockUserRepository.findOne.mockResolvedValue(null);
            
            let capturedUser: Partial<User> | null = null;
            mockUserRepository.create.mockImplementation((data) => {
              capturedUser = data;
              return {
                id: 'test-id',
                ...data,
                systemRole: SystemRole.USER,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as User;
            });
            
            mockUserRepository.save.mockImplementation(async (user) => user as User);

            await service.register({ email, password, name });

            // 저장된 사용자의 passwordHash가 원본 비밀번호와 다른지 확인
            expect(capturedUser).not.toBeNull();
            expect(capturedUser!.passwordHash).not.toBe(password);
            expect(capturedUser!.passwordHash).not.toContain(password);
            
            // bcrypt 해시 형식인지 확인
            expect(capturedUser!.passwordHash).toMatch(/^\$2[aby]\$/);
            
            // 원본 비밀번호로 검증 가능한지 확인
            const isValid = await bcrypt.compare(password, capturedUser!.passwordHash!);
            expect(isValid).toBe(true);
          },
        ),
        { numRuns: 5 },
      );
    }, 60000);
  });

  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => service.validatePasswordStrength('Pass1')).toThrow(
        '비밀번호는 최소 8자 이상이어야 합니다.',
      );
    });

    it('should reject passwords without numbers', () => {
      expect(() => service.validatePasswordStrength('PasswordOnly')).toThrow(
        '비밀번호는 영문과 숫자를 모두 포함해야 합니다.',
      );
    });

    it('should reject passwords without letters', () => {
      expect(() => service.validatePasswordStrength('12345678')).toThrow(
        '비밀번호는 영문과 숫자를 모두 포함해야 합니다.',
      );
    });

    it('should accept valid passwords', () => {
      expect(() => service.validatePasswordStrength('Password123')).not.toThrow();
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-id' } as User);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
        }),
      ).rejects.toThrow('이미 사용 중인 이메일입니다.');
    });

    it('should create user with hashed password', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((data) => ({
        id: 'new-id',
        ...data,
        systemRole: SystemRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User));
      mockUserRepository.save.mockImplementation(async (user) => user as User);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('validateRefreshSession', () => {
    it('should return user info for a valid refresh token', async () => {
      const user: User = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        systemRole: SystemRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const storedToken: RefreshToken = {
        id: 'token-1',
        userId: user.id,
        user,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: false,
        createdAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue({
        sub: user.id,
        tokenId: storedToken.id,
      });
      mockRefreshTokenRepository.findOne.mockResolvedValue(storedToken);
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateRefreshSession('refresh-token');

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
      });
    });

    it('should reject revoked refresh tokens', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        tokenId: 'token-1',
      });
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          email: 'revoked@example.com',
          passwordHash: 'hashed-password',
          name: 'Revoked User',
          systemRole: SystemRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: true,
        createdAt: new Date(),
      } as RefreshToken);

      await expect(
        service.validateRefreshSession('refresh-token'),
      ).rejects.toThrow('Refresh Token이 무효화되었습니다.');
    });
  });
});
