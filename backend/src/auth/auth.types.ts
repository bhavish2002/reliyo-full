import type { PlatformRole, PreferredRole } from '@prisma/client';

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

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
  user: PublicUserDto;
}
