import { reportUiError } from "@/lib/observability";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    reportUiError(error, `read_json_${key}`);
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    reportUiError(error, `write_json_${key}`);
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    reportUiError(error, `remove_item_${key}`);
  }
}
