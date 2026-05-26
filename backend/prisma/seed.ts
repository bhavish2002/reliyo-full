import { PlatformRole, PreferredRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Dev/demo users aligned with former frontend TEST_CREDENTIALS (national digits only in DB). */
const SEED_USERS = [
  {
    phoneE164: '+919000000001',
    name: 'Arjun Mehta',
    email: 'arjun@reliyo.com',
    platformRole: PlatformRole.user,
    preferredRole: PreferredRole.requestor,
  },
  {
    phoneE164: '+919000000002',
    name: 'Priya Sharma',
    email: 'priya@reliyo.com',
    platformRole: PlatformRole.user,
    preferredRole: PreferredRole.acceptor,
  },
  {
    phoneE164: '+919000000003',
    name: 'Super Admin',
    email: 'admin@reliyo.com',
    platformRole: PlatformRole.admin,
    preferredRole: null,
  },
] as const;

async function main(): Promise<void> {
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { phoneE164: u.phoneE164 },
      create: u,
      update: {
        name: u.name,
        email: u.email,
        platformRole: u.platformRole,
        preferredRole: u.preferredRole,
      },
    });
  }
  console.log(`Seeded ${SEED_USERS.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
