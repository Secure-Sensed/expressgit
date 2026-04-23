import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { App } from "@/app";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import { AuthProvider } from "@/hooks/use-auth";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </AdminAuthProvider>
  </React.StrictMode>
);
