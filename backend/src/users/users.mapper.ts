import type { User } from '@prisma/client';
import type { PublicUserDto } from '../auth/auth.types';
import { nationalDigitsFromE164 } from '../common/phone/phone.util';

const DEFAULT_DIAL = '+91';

export function toPublicUser(user: User): PublicUserDto {
  const role =
    user.platformRole === 'admin'
      ? 'admin'
      : user.preferredRole === 'acceptor'
        ? 'acceptor'
        : 'requestor';

  return {
    id: user.id,
    phone: nationalDigitsFromE164(user.phoneE164, DEFAULT_DIAL),
    name: user.name,
    email: user.email,
    role,
    platformRole: user.platformRole,
    suspended: user.suspendedAt != null,
  };
}
