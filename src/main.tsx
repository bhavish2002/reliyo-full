import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEFAULT_USER_SETTINGS, applyTheme } from "./lib/userSettings";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { traceEvent } from "./lib/observability";

// Apply persisted theme before first render to avoid flash
try {
  applyTheme(DEFAULT_USER_SETTINGS.darkMode);
} catch { /* noop */ }

traceEvent({ event: "app_bootstrap_start" });

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
