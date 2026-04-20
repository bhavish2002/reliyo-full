const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";

export const env = {
  appEnv: import.meta.env.VITE_APP_ENV ?? "development",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  enableDemoData: (import.meta.env.VITE_ENABLE_DEMO_DATA ?? "true") === "true",
};

export function isDevelopment(): boolean {
  return env.appEnv === "development";
}
