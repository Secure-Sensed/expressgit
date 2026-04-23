import { createContext, useContext, useEffect, useMemo, useState } from "react";

import * as api from "@/lib/api";
import type { User } from "@/types";

interface AdminAuthContextValue {
  admin: User | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const response = await api.getAdminSession();
    setAdmin(response.admin || null);
  }

  async function loadSession() {
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      loading,
      async login(payload) {
        const response = await api.adminLogin(payload);
        setAdmin(response.admin);
        return response.admin;
      },
      async logout() {
        await api.adminLogout();
        setAdmin(null);
      },
      refresh
    }),
    [admin, loading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return context;
}
