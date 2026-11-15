import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PackageSearch, Plus } from "lucide-react";
import { toast } from "sonner";

import { AuthDialog } from "@/components/auth-dialog";
import { StatusBadge } from "@/components/status-badge";
import { modeMeta } from "@/components/transport-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import * as api from "@/lib/api";
import { formatCountdown, liveState } from "@/lib/geo";
import { formatDateTime } from "@/lib/utils";
import type { Shipment } from "@/types";

export function AccountPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [draft, setDraft] = useState({ origin: "", destination: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const now = useNow(1000);

  async function load() {
    try {
      const response = await api.getShipments("me");
      setShipments(response.shipments || []);
    } catch (_error) {
      /* keep the last list */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setShipments([]);
      setLoading(false);
      return;
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.requestShipment({
        origin: draft.origin.trim(),
        destination: draft.destination.trim(),
        lastLocation: draft.origin.trim(),
        status: "Pending",
        events: [
          {
            title: "Shipment requested",
            location: draft.origin.trim(),
            details: draft.notes.trim() || "Requested by customer",
            timestamp: new Date().toISOString()
          }
        ]
      });
      toast.success(`Request received. Your tracking number is ${response.shipment.trackingNumber}.`);
      setDraft({ origin: "", destination: "", notes: "" });
      setShowRequest(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <p className="py-12 text-center text-sm text-[color:var(--muted-foreground)]">Loading…</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold text-[color:var(--ink-strong)]">Your account</h1>
        <p className="mt-3 text-[color:var(--muted-foreground)]">Sign in to see your shipments and request a new one.</p>
        <Button className="mt-6" onClick={() => setAuthOpen(true)}>
          Sign in or create an account
        </Button>
        <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">
          Just want to check a package?{" "}
          <Link to="/track" className="font-semibold underline underline-offset-4">
            Track by number
          </Link>
        </p>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  const live = shipments.map((shipment) => ({ shipment, state: liveState(shipment, now) }));
  const isDelivered = (row: (typeof live)[number]) => (row.shipment.liveRoute ? row.state.phase === "delivered" : /deliver/i.test(row.shipment.status));
  const active = live.filter((row) => !isDelivered(row));
  const delivered = live.filter(isDelivered);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[color:var(--ink-strong)]">Hello, {user.name || user.email}</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowRequest((value) => !value)}>
            <Plus className="h-4 w-4" />
            Request a shipment
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      {showRequest ? (
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="r-from">From</Label>
            <Input id="r-from" required value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} placeholder="City, country" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-to">To</Label>
            <Input id="r-to" required value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} placeholder="City, country" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="r-notes">Notes (optional)</Label>
            <Textarea id="r-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What are you sending, and anything we should know" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send request
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowRequest(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)] sm:col-span-2">We will confirm the request and start tracking once the parcel is collected.</p>
        </form>
      ) : null}

      <ShipmentGroup title="On the way" rows={active} loading={loading} empty="You have no shipments in progress." now={now} />
      {delivered.length ? <ShipmentGroup title="Delivered" rows={delivered} loading={false} empty="" now={now} /> : null}
    </div>
  );
}

function ShipmentGroup({
  title,
  rows,
  loading,
  empty,
  now
}: {
  title: string;
  rows: Array<{ shipment: Shipment; state: ReturnType<typeof liveState> }>;
  loading: boolean;
  empty: string;
  now: number;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      {loading ? (
        <div className="skeleton h-24 w-full" />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center text-sm text-[color:var(--muted-foreground)]">{empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ shipment, state }) => {
            const meta = modeMeta(shipment.transportMode);
            const delivered = state.phase === "delivered";
            return (
              <li key={shipment.trackingNumber} className="rounded-2xl border border-[color:var(--border)] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tabular text-sm font-semibold">{shipment.trackingNumber}</p>
                    <p className="mt-0.5 truncate font-display text-lg font-bold">
                      {shipment.origin.split(",")[0]} → {shipment.destination.split(",")[0]}
                    </p>
                  </div>
                  <StatusBadge status={shipment.liveRoute ? state.phase : shipment.status} />
                </div>

                {shipment.liveRoute ? (
                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
                      <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${state.overall * 100}%`, background: delivered ? "#15803d" : meta.color }} />
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      {delivered ? "Delivered" : `Arrives in ${formatCountdown(state.remainingMs)}`}
                      {shipment.estimatedDelivery && !delivered ? ` · ${formatDateTime(shipment.estimatedDelivery)}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">Last seen: {shipment.lastLocation}</p>
                )}

                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to={`/track?q=${encodeURIComponent(shipment.trackingNumber)}`}>
                    <PackageSearch className="h-4 w-4" />
                    Track and message support
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
