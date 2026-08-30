"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
      const data = response.ok ? await response.json() as { user?: AuthUser | null } : { user: null };
      const nextUser = data.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoaded, isSignedIn: Boolean(user), refresh, signOut }), [user, isLoaded, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
