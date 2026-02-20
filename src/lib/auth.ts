/**
 * Hardcoded auth system for frontend testing.
 * Three roles: requestor, acceptor, admin.
 * Will be replaced by Supabase auth in production.
 */

export type UserRole = "requestor" | "acceptor" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

// Hardcoded test credentials
export const TEST_CREDENTIALS: { phone: string; user: AuthUser }[] = [
  {
    phone: "9000000001",
    user: {
      id: "usr-req-001",
      name: "Arjun Mehta",
      email: "arjun@reliyo.com",
      phone: "9000000001",
      role: "requestor",
    },
  },
  {
    phone: "9000000002",
    user: {
      id: "usr-acc-001",
      name: "Priya Sharma",
      email: "priya@reliyo.com",
      phone: "9000000002",
      role: "acceptor",
    },
  },
  {
    phone: "9000000003",
    user: {
      id: "usr-adm-001",
      name: "Super Admin",
      email: "admin@reliyo.com",
      phone: "9000000003",
      role: "admin",
    },
  },
];

export function authenticateByPhone(phone: string): AuthUser | null {
  const match = TEST_CREDENTIALS.find((c) => c.phone === phone);
  return match?.user ?? null;
}

export function getCurrentUser(): AuthUser | null {
  const stored = localStorage.getItem("reliyo_current_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser): void {
  localStorage.setItem("reliyo_current_user", JSON.stringify(user));
}

export function clearCurrentUser(): void {
  localStorage.removeItem("reliyo_current_user");
}

export function getRedirectForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "requestor":
    case "acceptor":
      return "/dashboard";
  }
}
