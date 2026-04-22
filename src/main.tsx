import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

import { App } from "@/app";
import { AuthProvider } from "@/hooks/use-auth";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
