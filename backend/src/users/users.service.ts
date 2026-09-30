import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PatchMeDto } from './dto/patch-me.dto';
import { mergeUserPreferences } from './user-preferences.util';
import {
  getUserRatingStats,
  getUserRatingStatsMap,
  type UserRatingSnapshot,
} from './user-rating.util';

export type { UserRatingSnapshot };

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

  async patchMe(userId: string, dto: PatchMeDto): Promise<User> {
    const existing = await this.findByIdOrThrow(userId);
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim() || null;
    if (dto.bio !== undefined) data.profileBio = dto.bio.trim() || null;
    if (dto.location !== undefined) data.profileLocation = dto.location.trim() || null;
    if (dto.preferences !== undefined) {
      data.preferences = mergeUserPreferences(
        existing.preferences,
        dto.preferences,
      ) as unknown as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  getRatingStats(userId: string): Promise<UserRatingSnapshot> {
    return getUserRatingStats(this.prisma, userId);
  }

  getRatingStatsMap(userIds: string[]): Promise<Map<string, UserRatingSnapshot>> {
    return getUserRatingStatsMap(this.prisma, userIds);
  }
}
