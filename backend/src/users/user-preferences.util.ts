import type { Prisma } from '@prisma/client';

export type DarkModePreference = 'system' | 'light' | 'dark';

export interface UserPreferences {
  emailNotifications: boolean;
  taskUpdateAlerts: boolean;
  marketingEmails: boolean;
  preferredCurrency: string;
  darkMode: DarkModePreference;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  taskUpdateAlerts: true,
  marketingEmails: false,
  preferredCurrency: 'INR',
  darkMode: 'system',
};

const VALID_DARK_MODES = new Set<DarkModePreference>(['system', 'light', 'dark']);

export function parseUserPreferences(
  raw: Prisma.JsonValue | null | undefined,
): UserPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  const o = raw as Record<string, unknown>;
  const darkMode = o.darkMode;
  return {
    emailNotifications:
      typeof o.emailNotifications === 'boolean'
        ? o.emailNotifications
        : DEFAULT_USER_PREFERENCES.emailNotifications,
    taskUpdateAlerts:
      typeof o.taskUpdateAlerts === 'boolean'
        ? o.taskUpdateAlerts
        : DEFAULT_USER_PREFERENCES.taskUpdateAlerts,
    marketingEmails:
      typeof o.marketingEmails === 'boolean'
        ? o.marketingEmails
        : DEFAULT_USER_PREFERENCES.marketingEmails,
    preferredCurrency:
      typeof o.preferredCurrency === 'string' && o.preferredCurrency.length > 0
        ? o.preferredCurrency
        : DEFAULT_USER_PREFERENCES.preferredCurrency,
    darkMode:
      typeof darkMode === 'string' && VALID_DARK_MODES.has(darkMode as DarkModePreference)
        ? (darkMode as DarkModePreference)
        : DEFAULT_USER_PREFERENCES.darkMode,
  };
}

export function mergeUserPreferences(
  current: Prisma.JsonValue | null | undefined,
  patch: Partial<UserPreferences>,
): UserPreferences {
  const base = parseUserPreferences(current);
  return { ...base, ...patch };
}
