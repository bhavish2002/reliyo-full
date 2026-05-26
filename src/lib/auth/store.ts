import type { AuthUser } from "@/lib/auth/types";

let currentUser: AuthUser | null = null;

export function getAuthStoreUser(): AuthUser | null {
  return currentUser;
}

export function setAuthStoreUser(user: AuthUser | null): void {
  currentUser = user;
}
