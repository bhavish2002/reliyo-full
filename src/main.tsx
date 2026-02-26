import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getUserSettings, applyTheme } from "./lib/userSettings";

// Apply persisted theme before first render to avoid flash
try {
  const settings = getUserSettings("guest"); // fallback; real userId applied in Profile
  applyTheme(settings.darkMode);
} catch { /* noop */ }

createRoot(document.getElementById("root")!).render(<App />);
