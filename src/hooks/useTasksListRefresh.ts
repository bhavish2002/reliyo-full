import { useEffect, useState } from "react";
import { TASKS_CHANGED_EVENT } from "@/lib/tasks/events";

/** Bump version when tasks change or tab regains focus (near real-time lists). */
export function useTasksListRefresh(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(TASKS_CHANGED_EVENT, bump);
    window.addEventListener("focus", bump);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(TASKS_CHANGED_EVENT, bump);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return version;
}
