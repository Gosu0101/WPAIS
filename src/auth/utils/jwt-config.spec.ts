import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  buildJwtSignOptions,
  buildJwtVerifyOptions,
  getJwtAlgorithm,
  getJwtKeyConfig,
} from './jwt-config';

function createConfigService(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, defaultValue?: string) =>
      values[key] === undefined ? defaultValue : values[key],
    ),
  } as unknown as ConfigService;
}

describe('jwt-config', () => {
  it('defaults to HS256 and uses JWT_SECRET for signing and verification', () => {
    const configService = createConfigService({
      JWT_SECRET: 'test-secret',
    });

    expect(getJwtAlgorithm(configService)).toBe('HS256');
    expect(getJwtKeyConfig(configService)).toEqual({
      signKey: 'test-secret',
      verifyKey: 'test-secret',
    });
    expect(buildJwtVerifyOptions(configService)).toEqual({
      algorithms: ['HS256'],
      secret: 'test-secret',
    });
  });

  it('supports RS256 with inline PEM values', () => {
    const configService = createConfigService({
      JWT_ALGORITHM: 'RS256',
      JWT_PRIVATE_KEY:
        '-----BEGIN PRIVATE KEY-----\\nPRIVATE\\n-----END PRIVATE KEY-----',
      JWT_PUBLIC_KEY:
        '-----BEGIN PUBLIC KEY-----\\nPUBLIC\\n-----END PUBLIC KEY-----',
    });

    expect(getJwtAlgorithm(configService)).toBe('RS256');
    expect(getJwtKeyConfig(configService)).toEqual({
      signKey: '-----BEGIN PRIVATE KEY-----\nPRIVATE\n-----END PRIVATE KEY-----',
      verifyKey: '-----BEGIN PUBLIC KEY-----\nPUBLIC\n-----END PUBLIC KEY-----',
    });
    expect(buildJwtSignOptions(configService, '15m')).toEqual({
      algorithm: 'RS256',
      expiresIn: '15m',
    });
    expect(buildJwtVerifyOptions(configService)).toEqual({
      algorithms: ['RS256'],
      publicKey: '-----BEGIN PUBLIC KEY-----\nPUBLIC\n-----END PUBLIC KEY-----',
    });
  });

  it('rejects RS256 when keys are missing', () => {
    const configService = createConfigService({
      JWT_ALGORITHM: 'RS256',
    });

    expect(() => getJwtKeyConfig(configService)).toThrow(
      InternalServerErrorException,
    );
  });
});
