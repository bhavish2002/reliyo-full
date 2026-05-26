export type UserRole = "requestor" | "acceptor" | "admin";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: UserRole;
  suspended: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
