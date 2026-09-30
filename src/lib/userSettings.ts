/**
 * User settings — server-backed when authenticated (Sprint 8D-P0).
 * In-memory cache is populated from GET /me; localStorage is legacy fallback for guests only.
 */

import type { UserPreferences } from "@/lib/auth/types";

export type UserSettings = UserPreferences;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  emailNotifications: true,
  taskUpdateAlerts: true,
  marketingEmails: false,
  preferredCurrency: "INR",
  darkMode: "system",
};

const serverCache = new Map<string, UserSettings>();

function legacyStorageKey(userId: string): string {
  return `reliyo_settings_${userId}`;
}

export function setUserSettingsCache(userId: string, settings: UserSettings): void {
  serverCache.set(userId, { ...DEFAULT_USER_SETTINGS, ...settings });
}

export function clearUserSettingsCache(userId?: string): void {
  if (userId) serverCache.delete(userId);
  else serverCache.clear();
}

export function getUserSettings(
  userId: string,
  fromUser?: Partial<UserSettings> | null,
): UserSettings {
  if (fromUser) {
    return { ...DEFAULT_USER_SETTINGS, ...fromUser };
  }
  if (serverCache.has(userId)) {
    return { ...DEFAULT_USER_SETTINGS, ...serverCache.get(userId)! };
  }
  try {
    const raw = localStorage.getItem(legacyStorageKey(userId));
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...DEFAULT_USER_SETTINGS,
      ...Object.fromEntries(
        Object.entries(parsed).filter(([k]) => k in DEFAULT_USER_SETTINGS),
      ),
    };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

/** Apply theme to the document based on user setting */
export function applyTheme(mode: UserSettings["darkMode"]): void {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function formatMemberSince(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDisplayPhone(nationalDigits: string): string {
  const digits = nationalDigits.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return nationalDigits;
}
