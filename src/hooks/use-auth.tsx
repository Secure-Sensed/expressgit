import { createContext, useContext, useEffect, useMemo, useState } from "react";

import * as api from "@/lib/api";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<User>;
  signup: (payload: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const response = await api.getSession();
    setUser(response.user || null);
  }

  async function loadSession() {
    try {
      await refresh();
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(payload) {
        const response = await api.login(payload);
        setUser(response.user);
        return response.user;
      },
      async signup(payload) {
        const response = await api.signup(payload);
        setUser(response.user);
        return response.user;
      },
      async logout() {
        await api.logout();
        setUser(null);
      },
      refresh
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
