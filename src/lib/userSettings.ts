/**
 * User settings persistence layer.
 * Stores settings per-user in localStorage.
 */

export interface UserSettings {
  emailNotifications: boolean;
  twoFactorAuth: boolean;
  publicProfile: boolean;
  taskUpdateAlerts: boolean;     // SMS/push for task status changes
  marketingEmails: boolean;      // promotional content
  availableForWork: boolean;     // show in "available acceptors" pool
  autoAcceptRating: number;      // auto-accept tasks from users above this rating (0 = disabled)
  preferredCurrency: string;     // default currency code
  darkMode: "system" | "light" | "dark";
}

const DEFAULTS: UserSettings = {
  emailNotifications: true,
  twoFactorAuth: false,
  publicProfile: true,
  taskUpdateAlerts: true,
  marketingEmails: false,
  availableForWork: true,
  autoAcceptRating: 0,
  preferredCurrency: "INR",
  darkMode: "system",
};

function storageKey(userId: string): string {
  return `reliyo_settings_${userId}`;
}

export function getUserSettings(userId: string): UserSettings {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUserSettings(userId: string, settings: UserSettings): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(settings));
}

export function updateUserSetting<K extends keyof UserSettings>(
  userId: string,
  key: K,
  value: UserSettings[K],
): UserSettings {
  const current = getUserSettings(userId);
  const updated = { ...current, [key]: value };
  saveUserSettings(userId, updated);
  return updated;
}
