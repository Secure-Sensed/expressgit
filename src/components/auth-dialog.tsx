import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

type AuthMode = "signup" | "login";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError("");
      setMode("signup");
      setForm({ name: "", email: "", password: "" });
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({
          email: form.email.trim(),
          password: form.password
        });
      } else {
        await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        });
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Access your shipment desk" : "Create your shipment portal"}</DialogTitle>
          <DialogDescription>
            Sign in to request parcels, save tracked shipments, and keep support threads attached to your account.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Create account</TabsTrigger>
            <TabsTrigger value="login">Log in</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Full name</Label>
              <Input
                id="auth-name"
                autoComplete="name"
                placeholder="Ariel Foster"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="dispatch@client.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

          <Button className="w-full" size="lg" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
