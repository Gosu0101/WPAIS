import { readFileSync } from 'fs';
import type { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export type SupportedJwtAlgorithm = 'HS256' | 'RS256';

interface JwtKeyConfig {
  signKey: string;
  verifyKey: string;
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n').trim();
}

function readConfiguredValue(
  configService: ConfigService,
  valueKey: string,
  pathKey: string,
) {
  const inlineValue = configService.get<string>(valueKey);
  if (inlineValue) {
    return normalizePem(inlineValue);
  }

  const filePath = configService.get<string>(pathKey);
  if (filePath) {
    return readFileSync(filePath, 'utf8').trim();
  }

  return null;
}

export function getJwtAlgorithm(
  configService: ConfigService,
): SupportedJwtAlgorithm {
  const configuredAlgorithm =
    configService.get<string>('JWT_ALGORITHM', 'HS256')?.toUpperCase() ||
    'HS256';

  if (configuredAlgorithm === 'HS256' || configuredAlgorithm === 'RS256') {
    return configuredAlgorithm;
  }

  throw new InternalServerErrorException(
    `지원하지 않는 JWT_ALGORITHM입니다: ${configuredAlgorithm}`,
  );
}

export function getJwtKeyConfig(configService: ConfigService): JwtKeyConfig {
  const algorithm = getJwtAlgorithm(configService);

  if (algorithm === 'HS256') {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET이 설정되지 않았습니다.',
      );
    }

    return {
      signKey: secret,
      verifyKey: secret,
    };
  }

  const privateKey = readConfiguredValue(
    configService,
    'JWT_PRIVATE_KEY',
    'JWT_PRIVATE_KEY_PATH',
  );
  const publicKey = readConfiguredValue(
    configService,
    'JWT_PUBLIC_KEY',
    'JWT_PUBLIC_KEY_PATH',
  );

  if (!privateKey || !publicKey) {
    throw new InternalServerErrorException(
      'RS256을 사용하려면 JWT_PRIVATE_KEY/JWT_PUBLIC_KEY 또는 *_PATH 설정이 필요합니다.',
    );
  }

  return {
    signKey: privateKey,
    verifyKey: publicKey,
  };
}

export function buildJwtSignOptions(
  configService: ConfigService,
  expiresIn: string,
): JwtSignOptions {
  return {
    algorithm: getJwtAlgorithm(configService),
    expiresIn: expiresIn as JwtSignOptions['expiresIn'],
  };
}

export function buildJwtVerifyOptions(
  configService: ConfigService,
): JwtVerifyOptions & { secret?: string; publicKey?: string } {
  const algorithm = getJwtAlgorithm(configService);
  const keys = getJwtKeyConfig(configService);

  if (algorithm === 'HS256') {
    return {
      algorithms: [algorithm],
      secret: keys.verifyKey,
    };
  }

  return {
    algorithms: [algorithm],
    publicKey: keys.verifyKey,
  };
}
