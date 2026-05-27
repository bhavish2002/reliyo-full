import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByIdOrThrow(id: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id } }).then((user) => {
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'User not found.',
        });
      }
      return user;
    });
  }
}
