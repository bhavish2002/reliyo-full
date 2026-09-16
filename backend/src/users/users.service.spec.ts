import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  parseUserPreferences,
} from './user-preferences.util';

describe('user-preferences.util', () => {
  it('returns defaults for null preferences', () => {
    expect(parseUserPreferences(null)).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('merges partial preferences', () => {
    const merged = mergeUserPreferences(
      { darkMode: 'light', preferredCurrency: 'USD' },
      { darkMode: 'dark' },
    );
    expect(merged.darkMode).toBe('dark');
    expect(merged.preferredCurrency).toBe('USD');
  });
});

describe('UsersService', () => {
  const mockUser = {
    id: 'u1',
    phoneE164: '+919000000002',
    name: 'Priya Sharma',
    email: 'priya@reliyo.com',
    platformRole: 'user',
    preferredRole: 'acceptor',
    suspendedAt: null,
    profileBio: null,
    profileLocation: null,
    preferences: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockUser, ...data }),
        ),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('patchMe updates profile fields', async () => {
    const updated = await service.patchMe('u1', {
      bio: 'Hello world',
      location: 'Mumbai',
      email: 'new@reliyo.com',
    });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(updated.profileBio).toBe('Hello world');
    expect(updated.profileLocation).toBe('Mumbai');
    expect(updated.email).toBe('new@reliyo.com');
  });

  it('patchMe merges preferences', async () => {
    await service.patchMe('u1', {
      preferences: { darkMode: 'dark', preferredCurrency: 'USD' },
    });
    const call = prisma.user.update.mock.calls[0][0];
    expect(call.data.preferences.darkMode).toBe('dark');
    expect(call.data.preferences.preferredCurrency).toBe('USD');
    expect(call.data.preferences.emailNotifications).toBe(true);
  });
});
