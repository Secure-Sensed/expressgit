import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Search, UserCircle2 } from "lucide-react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { to: "/", label: "Shipping" },
  { to: "/track", label: "Tracking" },
  { to: "/operations", label: "Support" },
  { to: "/admin", label: "Account" }
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[color:var(--foreground)]">
      <header className="bg-[color:var(--fedex-purple)] text-white">
        <div className="mx-auto flex h-[92px] w-full max-w-[1220px] items-center justify-between gap-6 px-4">
          <Link className="inline-flex items-baseline text-[58px] font-bold leading-none tracking-[-1px]" to="/">
            <span>Fed</span>
            <span className="text-[color:var(--fedex-orange)]">Ex</span>
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navigation.map((item) => {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-1 text-[16px] font-normal text-white/95 transition-colors hover:text-white",
                      isActive && "font-medium"
                    )
                  }
                >
                  <span>{item.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => void logout()}
                  disabled={loading}
                  className="rounded-none text-[16px] font-medium text-white hover:bg-transparent hover:text-white/80"
                >
                  {user.name || user.email}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void logout()}
                  disabled={loading}
                  className="rounded-none text-[16px] font-medium text-white hover:bg-transparent hover:text-white/80"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setAuthOpen(true)}
                disabled={loading}
                className="rounded-none text-[16px] font-medium text-white hover:bg-transparent hover:text-white/80"
              >
                Sign Up/Log In
              </Button>
            )}
            <button
              aria-label="Profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white/10"
              type="button"
              onClick={() => setAuthOpen(true)}
            >
              <UserCircle2 className="h-5 w-5" />
            </button>
            <button
              aria-label="Search"
              className="inline-flex h-9 w-9 items-center justify-center text-white transition-colors hover:text-white/80"
              type="button"
            >
              <Search className="h-7 w-7" />
            </button>
          </div>
        </div>
      </header>

      <main className={cn(location.pathname === "/" ? "pb-12" : "mx-auto w-full max-w-[1220px] px-4 pb-12 pt-8")}>{children}</main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
