import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const ADMIN_ONBOARDING_KEY = "fdx_admin_onboarded_v1";
const ADMIN_SHOW_ONBOARDING_KEY = "fdx_admin_show_onboarding_v1";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login({ email, password });

      if (!window.localStorage.getItem(ADMIN_ONBOARDING_KEY)) {
        window.sessionStorage.setItem(ADMIN_SHOW_ONBOARDING_KEY, "1");
      }

      toast.success("Admin access granted.");
      navigate("/admin", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1edf9] text-[color:var(--fedex-purple)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Admin Sign In</CardTitle>
              <CardDescription>Use your admin credentials to access shipment management tools.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin email</Label>
              <Input
                autoComplete="email"
                id="admin-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@fedex.local"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                autoComplete="current-password"
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                required
                type="password"
                value={password}
              />
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in to admin
            </Button>
          </form>
          <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">
            Credentials are controlled on the server via `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
