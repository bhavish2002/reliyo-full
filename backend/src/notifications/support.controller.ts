import { Body, Controller, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { AuthUserPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @Transform(({ value }) => normalizePhoneForApi(String(value ?? '')))
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  issue!: string;
}

function normalizePhoneForApi(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits || phone.trim();
}

function subjectFromIssue(issue: string, subject: string): string {
  const trimmed = subject.trim();
  if (trimmed) return trimmed.slice(0, 200);
  const line = issue.trim().split(/\r?\n/)[0] ?? issue.trim();
  return line.slice(0, 80);
}

@Controller('support')
export class SupportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('tickets')
  async create(@Body() dto: CreateSupportTicketDto, @Req() req: Request) {
    const userId = this.optionalUserId(req);
    const issue = dto.issue.trim();
    const publicId = `RT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        publicId,
        userId,
        subject: subjectFromIssue(issue, dto.subject),
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        issue,
      },
    });
    return {
      id: ticket.publicId,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  private optionalUserId(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwt.verify<AuthUserPayload>(header.slice(7));
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
