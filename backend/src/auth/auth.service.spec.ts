import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  it('phoneE164FromDto normalizes India numbers', () => {
    const service = new AuthService(
      {} as PrismaService,
      {} as OtpService,
      {} as TokenService,
      {} as UsersService,
    );
    expect(service.phoneE164FromDto('9000000001', '+91')).toBe('+919000000001');
  });
});

describe('AuthService module', () => {
  it('compiles', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AuthService,
        { provide: OtpService, useValue: { sendOtp: jest.fn(), verifyOtp: jest.fn() } },
        { provide: TokenService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    expect(moduleRef.get(AuthService)).toBeDefined();
  });
});
