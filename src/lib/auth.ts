/**
 * Auth facade — session is API-backed (Sprint 3).
 * Access token in memory; refresh token in httpOnly cookie.
 */
import { getAuthStoreUser } from "@/lib/auth/store";
import type { AuthUser, UserRole } from "@/lib/auth/types";
import { getRedirectForRole } from "@/lib/auth/api";

export type { AuthUser, UserRole };

/** @deprecated Use useAuth() in React components. Sync read for legacy call sites. */
export function getCurrentUser(): AuthUser | null {
  return getAuthStoreUser();
}

/** @deprecated Use useAuth().signOut() */
export function clearCurrentUser(): void {
  getAuthStoreUser();
  // no-op: signOut clears via AuthContext
}

export { getRedirectForRole };
