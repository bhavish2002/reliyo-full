import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getUserSettings, applyTheme } from "./lib/userSettings";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { traceEvent } from "./lib/observability";

// Apply persisted theme before first render to avoid flash
try {
  const settings = getUserSettings("guest"); // fallback; real userId applied in Profile
  applyTheme(settings.darkMode);
} catch { /* noop */ }

traceEvent({ event: "app_bootstrap_start" });

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
