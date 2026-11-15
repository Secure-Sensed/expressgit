import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "Home", end: true },
  { to: "/track", label: "Track" },
  { to: "/operations", label: "Map" }
];

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#f59e0b" />
      <path d="M8 27c4-12 14-17 24-15" fill="none" stroke="#0b3350" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 5.2" />
      <circle cx="9" cy="27" r="3.4" fill="#0b3350" />
      <circle cx="31" cy="12" r="3.4" fill="#0b3350" />
    </svg>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();
  const home = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className={cn("sticky top-0 z-40 border-b", home ? "border-[rgba(255,255,255,0.12)] bg-[color:var(--brand-primary)]/92 text-white backdrop-blur-md" : "glass border-[color:var(--border)]")}>
        <div className="mx-auto flex h-[68px] w-full max-w-[1220px] items-center justify-between gap-4 px-4">
          <Link className="inline-flex items-center gap-2.5" to="/">
            <LogoMark />
            <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">
              {BRAND.logoMain}
              <span className="text-[color:var(--brand-accent)]">{BRAND.logoAccent}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-[15px] font-medium transition-colors",
                    home ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]",
                    isActive && (home ? "bg-white/14 text-white" : "bg-[color:var(--surface-2)] text-[color:var(--foreground)]")
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-[160px] truncate text-sm font-medium sm:inline">{user.name || user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => void logout()} disabled={loading} aria-label="Sign out" className={home ? "text-white hover:bg-white/10 hover:text-white" : ""}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setAuthOpen(true)}
                disabled={loading}
                className={cn("rounded-full", home && "bg-[color:var(--brand-accent)] text-[#2b1a00] hover:bg-[#fbb52f]")}
              >
                <UserRound className="h-4 w-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>

        <nav className={cn("flex gap-1 overflow-x-auto px-3 pb-2 md:hidden", home ? "text-white" : "")} aria-label="Main mobile">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium", isActive ? (home ? "bg-white/16" : "bg-[color:var(--surface-2)]") : "opacity-75")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={cn("flex-1", !home && "mx-auto w-full max-w-[1220px] px-4 pb-14 pt-8")}>{children}</main>

      <footer className="border-t border-[color:var(--border)] bg-white">
        <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-[color:var(--muted-foreground)]">
          <span className="inline-flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <strong className="font-display text-[color:var(--foreground)]">
              {BRAND.logoMain}
              {BRAND.logoAccent}
            </strong>
            · {BRAND.tagline}
          </span>
          <a className="hover:text-[color:var(--foreground)]" href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail}
          </a>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
