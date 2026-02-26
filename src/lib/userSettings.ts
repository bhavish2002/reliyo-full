/**
 * User settings persistence layer.
 * Stores settings per-user in localStorage.
 */

export interface UserSettings {
  emailNotifications: boolean;
  taskUpdateAlerts: boolean;
  marketingEmails: boolean;
  preferredCurrency: string;
  darkMode: "system" | "light" | "dark";
}

const DEFAULTS: UserSettings = {
  emailNotifications: true,
  taskUpdateAlerts: true,
  marketingEmails: false,
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
    const parsed = JSON.parse(raw);
    // Strip removed keys, merge with defaults
    return { ...DEFAULTS, ...Object.fromEntries(
      Object.entries(parsed).filter(([k]) => k in DEFAULTS)
    )};
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

/** Apply theme to the document based on user setting */
export function applyTheme(mode: "system" | "light" | "dark"): void {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}
