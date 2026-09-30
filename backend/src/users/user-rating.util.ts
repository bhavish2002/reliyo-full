import type { PrismaService } from '../prisma/prisma.service';

export interface UserRatingSnapshot {
  averageRating: number | null;
  ratingCount: number;
}

function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Average of requestor-submitted acceptor ratings (closed tasks with rating). */
export async function getUserRatingStatsMap(
  prisma: PrismaService,
  userIds: string[],
): Promise<Map<string, UserRatingSnapshot>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, UserRatingSnapshot>();
  for (const id of unique) {
    map.set(id, { averageRating: null, ratingCount: 0 });
  }
  if (!unique.length) return map;

  const rows = await prisma.task.groupBy({
    by: ['acceptorId'],
    where: {
      acceptorId: { in: unique },
      rating: { not: null },
      cancelledAt: null,
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  for (const row of rows) {
    if (!row.acceptorId) continue;
    const avg =
      row._avg.rating != null ? roundRating(Number(row._avg.rating)) : null;
    map.set(row.acceptorId, {
      averageRating: avg,
      ratingCount: row._count.rating,
    });
  }

  return map;
}

export async function getUserRatingStats(
  prisma: PrismaService,
  userId: string,
): Promise<UserRatingSnapshot> {
  const map = await getUserRatingStatsMap(prisma, [userId]);
  return map.get(userId) ?? { averageRating: null, ratingCount: 0 };
}
