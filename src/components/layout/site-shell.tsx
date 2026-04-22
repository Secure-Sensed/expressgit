import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Activity, Package2, ShieldCheck, Truck, UserCircle2 } from "lucide-react";

import { AuthDialog } from "@/components/auth-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { to: "/", label: "Overview", icon: Package2 },
  { to: "/track", label: "Tracking", icon: Activity },
  { to: "/operations", label: "Operations", icon: Truck },
  { to: "/admin", label: "Admin", icon: ShieldCheck }
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,127,41,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(35,177,255,0.14),transparent_24%),linear-gradient(180deg,rgba(11,17,32,0.98),rgba(11,17,32,1))]" />
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-40 rounded-[30px] border border-white/10 bg-[color:var(--panel)]/92 px-4 py-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link className="group inline-flex items-center gap-3" to="/">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-[color:var(--accent-foreground)] shadow-[0_18px_30px_rgba(255,127,41,0.3)]">
                  <Package2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">Express Git</p>
                  <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">Logistics Control</p>
                </div>
              </Link>
              <Badge variant="accent" className="hidden lg:inline-flex">
                Live network
              </Badge>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:bg-white/8 hover:text-[color:var(--foreground)]",
                        isActive && "bg-white text-[color:var(--ink-strong)] shadow-[0_12px_30px_rgba(12,18,32,0.12)]"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center justify-between gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Portal</p>
                <p className="text-sm text-[color:var(--foreground)]">{user ? user.email : "Guest session"}</p>
              </div>
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{(user.name || user.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" onClick={() => void logout()} disabled={loading}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button variant="frosted" onClick={() => setAuthOpen(true)} disabled={loading}>
                  <UserCircle2 className="h-4 w-4" />
                  Sign up / log in
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="relative flex-1 pt-8">{children}</main>

        <footer className="relative mt-12 rounded-[30px] border border-white/8 bg-white/4 px-6 py-5 text-sm text-[color:var(--muted-foreground)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>Operational dashboard for tracking, support, and shipment management.</p>
            <p>Built on the existing ExpressGit API layer with a modern client shell.</p>
          </div>
        </footer>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
