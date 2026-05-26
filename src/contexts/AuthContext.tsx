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
import type { AuthUser } from "@/lib/auth/types";
import { ApiClientError } from "@/lib/api/client";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    setUser(nextUser);
    setAuthStoreUser(nextUser);
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    setAuthStoreUser(me);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutSession();
    } catch {
      /* clear local session even if API fails */
    }
    clearAccessToken();
    setUser(null);
    setAuthStoreUser(null);
  }, []);

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
