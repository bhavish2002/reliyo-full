import type { PlatformRole, PreferredRole } from '@prisma/client';
import type { UserPreferences } from '../users/user-preferences.util';

export interface AuthUserPayload {
  sub: string;
  phoneE164: string;
  platformRole: PlatformRole;
  preferredRole: PreferredRole | null;
}

export interface PublicUserDto {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: 'requestor' | 'acceptor' | 'admin';
  platformRole: PlatformRole;
  suspended: boolean;
}

export interface MeProfileDto extends PublicUserDto {
  bio: string | null;
  location: string | null;
  createdAt: string;
  preferences: UserPreferences;
  averageRating?: number | null;
  ratingCount?: number;
}

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
  user: PublicUserDto;
}
