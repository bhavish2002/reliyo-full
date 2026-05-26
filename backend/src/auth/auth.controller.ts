import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuspensionGuard } from './guards/suspension.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUserPayload } from './auth.types';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/users.mapper';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  @Post('otp/send')
  @HttpCode(200)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, refreshRaw } = await this.auth.verifyOtp(
      dto,
      req.headers['user-agent'],
    );
    res.cookie(
      TokenService.refreshCookieName(),
      refreshRaw,
      this.tokens.refreshCookieOptions(),
    );
    return tokens;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[TokenService.refreshCookieName()] as
      | string
      | undefined;
    const { tokens, refreshRaw } = await this.auth.refreshFromCookie(
      raw,
      req.headers['user-agent'],
    );
    res.cookie(
      TokenService.refreshCookieName(),
      refreshRaw,
      this.tokens.refreshCookieOptions(),
    );
    return tokens;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[TokenService.refreshCookieName()] as
      | string
      | undefined;
    await this.auth.logout(raw);
    res.clearCookie(TokenService.refreshCookieName(), {
      path: '/',
    });
  }
}

@Controller()
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, SuspensionGuard)
  async me(@CurrentUser() payload: AuthUserPayload) {
    const user = await this.users.findByIdOrThrow(payload.sub);
    return toPublicUser(user);
  }
}
