import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  logoutSession,
  refreshSession,
} from "@/lib/auth/api";
import { setAuthStoreUser } from "@/lib/auth/store";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import { clearUserLocalSession } from "@/lib/auth/clearUserSession";
import type { AuthUser } from "@/lib/auth/types";
import { ApiClientError } from "@/lib/api/client";
import {
  applyTheme,
  clearUserSettingsCache,
  setUserSettingsCache,
} from "@/lib/userSettings";
import { TASKS_CHANGED_EVENT } from "@/lib/tasks/events";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyUserPreferences(user: AuthUser): void {
  if (user.preferences) {
    setUserSettingsCache(user.id, user.preferences);
    applyTheme(user.preferences.darkMode);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    setUser(nextUser);
    setAuthStoreUser(nextUser);
    void fetchMe()
      .then((me) => {
        setUser(me);
        setAuthStoreUser(me);
        applyUserPreferences(me);
      })
      .catch(() => {
        if (nextUser.preferences) applyUserPreferences(nextUser);
      });
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    setAuthStoreUser(me);
    applyUserPreferences(me);
  }, []);

  useEffect(() => {
    const onTasksChanged = () => {
      void refreshProfile().catch(() => undefined);
    };
    window.addEventListener(TASKS_CHANGED_EVENT, onTasksChanged);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onTasksChanged);
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const userId = user?.id;
    try {
      await logoutSession();
    } catch {
      /* clear local session even if API fails */
    }
    clearAccessToken();
    clearUserLocalSession();
    if (userId) clearUserSettingsCache(userId);
    setUser(null);
    setAuthStoreUser(null);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await refreshSession();
        if (cancelled) return;
        setSession(tokens.accessToken, tokens.user);
      } catch {
        if (cancelled) return;
        clearAccessToken();
        setUser(null);
        setAuthStoreUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user != null,
      setSession,
      signOut,
      refreshProfile,
    }),
    [user, isLoading, setSession, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
