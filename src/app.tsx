import { Route, Routes } from "react-router-dom";

import { SiteShell } from "@/components/layout/site-shell";
import { AdminPage } from "@/pages/admin-page";
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
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  );
}
