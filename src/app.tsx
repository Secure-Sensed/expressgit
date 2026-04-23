import { Navigate, Route, Routes } from "react-router-dom";

import { SiteShell } from "@/components/layout/site-shell";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminPage } from "@/pages/admin-page";
import { AdminLoginPage } from "@/pages/admin-login-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { OperationsPage } from "@/pages/operations-page";
import { TrackingPage } from "@/pages/tracking-page";

export function App() {
  return (
    <SiteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/track" element={<TrackingPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/admin/login" element={<AdminLoginRoute />} />
        <Route path="/admin" element={<ProtectedAdminRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  );
}

function ProtectedAdminRoute() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <div className="py-10 text-center text-sm text-[color:var(--muted-foreground)]">Checking admin session...</div>;
  }

  if (!admin) {
    return <Navigate replace to="/admin/login" />;
  }

  return <AdminPage />;
}

function AdminLoginRoute() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <div className="py-10 text-center text-sm text-[color:var(--muted-foreground)]">Checking admin session...</div>;
  }

  if (admin) {
    return <Navigate replace to="/admin" />;
  }

  return <AdminLoginPage />;
}
