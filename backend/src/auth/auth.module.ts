import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SuspensionGuard } from './guards/suspension.guard';
import { RolesGuard } from './guards/roles.guard';
import { TaskContextGuard } from './guards/task-context.guard';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { DevOtpProvider } from './providers/dev-otp.provider';
import { TwilioOtpProvider } from './providers/twilio-otp.provider';
import { OTP_PROVIDER } from './providers/otp-provider.interface';

@Module({
  imports: [
    UsersModule,
    LifecycleModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          'dev-access-secret-change-me',
        ),
        signOptions: {
          expiresIn: Number(config.get('JWT_ACCESS_TTL_SEC', 900)),
        },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    SuspensionGuard,
    RolesGuard,
    TaskContextGuard,
    DevOtpProvider,
    TwilioOtpProvider,
    {
      provide: OTP_PROVIDER,
      inject: [ConfigService, DevOtpProvider, TwilioOtpProvider],
      useFactory: (
        config: ConfigService,
        dev: DevOtpProvider,
        twilio: TwilioOtpProvider,
      ) => {
        const useTwilio =
          config.get<string>('OTP_PROVIDER', 'dev') === 'twilio' &&
          config.get<string>('TWILIO_ACCOUNT_SID');
        return useTwilio ? twilio : dev;
      },
    },
  ],
  exports: [
    AuthService,
    TokenService,
    JwtModule,
    SuspensionGuard,
    RolesGuard,
    TaskContextGuard,
  ],
})
export class AuthModule {}
