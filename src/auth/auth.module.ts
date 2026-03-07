import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildJwtSignOptions, getJwtAlgorithm, getJwtKeyConfig } from './utils/jwt-config';

// Entities
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ProjectMember } from '../notification/entities/project-member.entity';

// Services
import { AuthService } from './services/auth.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ProjectPermissionGuard } from './guards/project-permission.guard';

// Controllers
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, ProjectMember]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        signOptions: {
          ...buildJwtSignOptions(
            configService,
            configService.get<string>('JWT_EXPIRES_IN', '15m'),
          ),
        },
        ...(getJwtAlgorithm(configService) === 'HS256'
          ? { secret: getJwtKeyConfig(configService).signKey }
          : {
              privateKey: getJwtKeyConfig(configService).signKey,
              publicKey: getJwtKeyConfig(configService).verifyKey,
            }),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ProjectPermissionGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    ProjectPermissionGuard,
    TypeOrmModule,
  ],
})
export class AuthModule {}
