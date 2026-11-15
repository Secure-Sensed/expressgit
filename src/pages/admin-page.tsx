import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, LogOut, MapPin, Pencil, Plus, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { modeMeta } from "@/components/transport-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import * as api from "@/lib/api";
import { liveState } from "@/lib/geo";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { Shipment, Stats, SupportMessage, SupportThread, TransportMode, User } from "@/types";

type Tab = "shipments" | "messages" | "customers";

const MANUAL_STATUSES = ["Pending", "In Transit", "Out for Delivery", "Delivered", "Exception"];
const MODES: Array<{ value: TransportMode; label: string }> = [
  { value: "air", label: "Air freight" },
  { value: "express", label: "Express air" },
  { value: "ground", label: "Road" },
  { value: "sea", label: "Sea" }
];

interface Draft {
  trackingNumber: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  departedAt: string;
  live: boolean;
  status: string;
  lastLocation: string;
  customerName: string;
  customerEmail: string;
}

const selectClass =
  "h-11 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]";

function toLocalInput(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function newTrackingNumber() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("") + String(Date.now()).slice(-6);
}

function emptyDraft(): Draft {
  return {
    trackingNumber: "",
    origin: "",
    destination: "",
    transportMode: "air",
    departedAt: toLocalInput(),
    live: true,
    status: "In Transit",
    lastLocation: "",
    customerName: "",
    customerEmail: ""
  };
}

function draftFrom(shipment: Shipment): Draft {
  return {
    trackingNumber: shipment.trackingNumber,
    origin: shipment.origin,
    destination: shipment.destination,
    transportMode: (shipment.transportMode || "ground") as TransportMode,
    departedAt: toLocalInput(shipment.departedAt || shipment.createdAt),
    live: Boolean(shipment.liveRoute),
    status: shipment.status,
    lastLocation: shipment.lastLocation,
    customerName: shipment.customerName || "",
    customerEmail: shipment.customerEmail || ""
  };
}

export function AdminPage() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("shipments");
  const [stats, setStats] = useState<Stats>({ total: 0, inTransit: 0, delivered: 0, customers: 0 });
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ isNew: boolean; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Shipment | null>(null);
  const [openThread, setOpenThread] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");

  async function load() {
    try {
      const [statsRes, shipmentsRes, threadsRes, usersRes] = await Promise.all([
        api.getStats(),
        api.getShipments(),
        api.getSupportThreads(),
        api.getUsers()
      ]);
      setStats(statsRes);
      setShipments(shipmentsRes.shipments || []);
      setThreads(threadsRes.threads || []);
      setUsers(usersRes.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!openThread) return;
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const response = await api.getSupportMessages(openThread);
        if (!cancelled) setMessages(response.messages || []);
      } catch (_error) {
        /* keep what is shown */
      }
    };
    void fetchMessages();
    const timer = window.setInterval(fetchMessages, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [openThread]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return shipments.filter((shipment) =>
      !needle ||
      [shipment.trackingNumber, shipment.origin, shipment.destination, shipment.customerName, shipment.customerEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [shipments, search]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEditing((current) => (current ? { ...current, draft: { ...current.draft, [key]: value } } : current));
  }

  async function save() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.origin.trim() || !d.destination.trim()) {
      toast.error("Origin and destination are required.");
      return;
    }
    if (d.customerEmail && !/^\S+@\S+\.\S+$/.test(d.customerEmail)) {
      toast.error("Enter a valid customer email, or leave it empty.");
      return;
    }

    const existing = shipments.find((item) => item.trackingNumber === d.trackingNumber);
    const payload: Partial<Shipment> = {
      trackingNumber: d.trackingNumber.trim() || newTrackingNumber(),
      origin: d.origin.trim(),
      destination: d.destination.trim(),
      transportMode: d.transportMode,
      liveRoute: d.live,
      status: d.live ? "In Transit" : d.status,
      lastLocation: d.live ? d.origin.trim() : d.lastLocation.trim() || d.origin.trim(),
      customerName: d.customerName.trim() || undefined,
      customerEmail: d.customerEmail.trim() || undefined
    };
    if (d.live) payload.departedAt = new Date(d.departedAt).toISOString();
    if (existing && !d.live) payload.events = existing.events;

    setSaving(true);
    try {
      const response = await api.upsertShipment(payload);
      const note = response.notification;
      toast.success(
        `${response.action === "created" ? "Created" : "Saved"} ${response.shipment.trackingNumber}` +
          (note?.sent ? " · customer emailed" : "")
      );
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the shipment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api.deleteShipment(toDelete.trackingNumber);
      toast.success(`Deleted ${toDelete.trackingNumber}`);
      setToDelete(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  }

  async function sendReply() {
    if (!openThread || !reply.trim()) return;
    try {
      await api.sendSupportMessage({ trackingNumber: openThread, message: reply.trim(), from: "admin" });
      setReply("");
      const response = await api.getSupportMessages(openThread);
      setMessages(response.messages || []);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send.");
    }
  }

  async function removeUser(email: string) {
    if (!window.confirm(`Delete the account ${email}? Their shipments are kept.`)) return;
    try {
      await api.deleteUser(email);
      toast.success("Account deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the account.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[color:var(--ink-strong)]">Admin</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">Signed in as {admin?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setTab("shipments");
              setEditing({ isNew: true, draft: emptyDraft() });
            }}
          >
            <Plus className="h-4 w-4" />
            New shipment
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Shipments" value={stats.total} />
        <Stat label="In transit" value={stats.inTransit} />
        <Stat label="Delivered" value={stats.delivered} />
        <Stat label="Customers" value={users.length} />
      </dl>

      <div className="flex gap-1 border-b border-[color:var(--border)]">
        {(
          [
            ["shipments", "Shipments"],
            ["messages", `Messages${threads.length ? ` (${threads.length})` : ""}`],
            ["customers", "Customers"]
          ] as Array<[Tab, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === value ? "border-[color:var(--brand-primary)] text-[color:var(--brand-primary)]" : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "shipments" ? (
        <section className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tracking number, city or customer" className="pl-10" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[color:var(--border)] bg-[color:var(--panel-subtle)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tracking number</th>
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map((shipment) => {
                  const meta = modeMeta(shipment.transportMode);
                  const state = liveState(shipment, Date.now());
                  return (
                    <tr key={shipment.trackingNumber} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="tabular font-semibold">{shipment.trackingNumber}</span>
                          <button
                            type="button"
                            aria-label="Copy tracking number"
                            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                            onClick={() => {
                              void navigator.clipboard?.writeText(shipment.trackingNumber);
                              toast.success("Copied");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[color:var(--muted-foreground)]">Created {formatRelativeTime(shipment.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {shipment.origin.split(",")[0]} → {shipment.destination.split(",")[0]}
                        {shipment.liveRoute && state.phase !== "delivered" ? (
                          <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
                            <div className="h-full rounded-full" style={{ width: `${state.overall * 100}%`, background: meta.color }} />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <meta.Icon size={15} />
                          {meta.short}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shipment.status} />
                        {!shipment.liveRoute ? <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Manual</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.customerName || shipment.customerEmail ? (
                          <>
                            <p>{shipment.customerName || "—"}</p>
                            <p className="text-xs text-[color:var(--muted-foreground)]">{shipment.customerEmail}</p>
                          </>
                        ) : (
                          <span className="text-[color:var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/track?q=${encodeURIComponent(shipment.trackingNumber)}`} target="_blank" aria-label="Open public tracking page">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing({ isNew: false, draft: draftFrom(shipment) })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setToDelete(shipment)}>
                            <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[color:var(--muted-foreground)]">
                      {shipments.length ? "No shipments match your search." : "No shipments yet. Use New shipment to add the first one."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="grid gap-4 md:grid-cols-[300px_1fr]">
          <ul className="max-h-[560px] divide-y divide-[color:var(--border)] overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-white">
            {threads.map((thread) => (
              <li key={thread.trackingNumber}>
                <button
                  type="button"
                  onClick={() => setOpenThread(thread.trackingNumber)}
                  className={cn("w-full px-4 py-3 text-left hover:bg-[color:var(--panel-subtle)]", openThread === thread.trackingNumber && "bg-[color:var(--panel-subtle)]")}
                >
                  <p className="tabular text-sm font-semibold">{thread.trackingNumber}</p>
                  <p className="truncate text-sm text-[color:var(--muted-foreground)]">{thread.lastMessage}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {thread.from === "user" ? "Customer" : "You"} · {formatRelativeTime(thread.timestamp)}
                  </p>
                </button>
              </li>
            ))}
            {threads.length === 0 ? <li className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">No messages yet.</li> : null}
          </ul>

          <div className="flex min-h-[320px] flex-col rounded-2xl border border-[color:var(--border)] bg-white">
            {openThread ? (
              <>
                <div className="border-b border-[color:var(--border)] px-4 py-3 font-semibold tabular">{openThread}</div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <div key={message.id} className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", message.from === "admin" ? "ml-auto bg-[color:var(--brand-primary)] text-white" : "bg-[color:var(--surface-2)]")}>
                      <p>{message.body}</p>
                      <p className={cn("mt-1 text-xs", message.from === "admin" ? "text-white/70" : "text-[color:var(--muted-foreground)]")}>{formatDateTime(message.timestamp)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-[color:var(--border)] p-3">
                  <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply" className="min-h-[44px] flex-1" />
                  <Button onClick={() => void sendReply()} disabled={!reply.trim()} aria-label="Send reply">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="m-auto p-8 text-sm text-[color:var(--muted-foreground)]">Select a conversation.</p>
            )}
          </div>
        </section>
      ) : null}

      {tab === "customers" ? (
        <section className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[color:var(--border)] bg-[color:var(--panel-subtle)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Shipments</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {users.map((user) => (
                <tr key={user.email}>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 tabular">{shipments.filter((s) => (s.customerEmail || "").toLowerCase() === user.email.toLowerCase()).length}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" aria-label={`Delete ${user.email}`} onClick={() => void removeUser(user.email)}>
                      <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[color:var(--muted-foreground)]">
                    No customer accounts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {editing ? (
            <>
              <DialogHeader>
                <DialogTitle>{editing.isNew ? "New shipment" : `Edit ${editing.draft.trackingNumber}`}</DialogTitle>
                <DialogDescription>
                  {editing.isNew ? "A tracking number is generated if you leave it blank." : "Changing a shipment emails the customer if an address is set."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                {editing.isNew ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="f-track">Tracking number (optional)</Label>
                    <Input id="f-track" value={editing.draft.trackingNumber} onChange={(event) => set("trackingNumber", event.target.value)} placeholder="Generated automatically" />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="f-origin">From</Label>
                  <Input id="f-origin" value={editing.draft.origin} onChange={(event) => set("origin", event.target.value)} placeholder="City, country" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-dest">To</Label>
                  <Input id="f-dest" value={editing.draft.destination} onChange={(event) => set("destination", event.target.value)} placeholder="City, country" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-mode">Transport</Label>
                  <select id="f-mode" className={selectClass} value={editing.draft.transportMode} onChange={(event) => set("transportMode", event.target.value as TransportMode)}>
                    {MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-name">Customer name</Label>
                  <Input id="f-name" value={editing.draft.customerName} onChange={(event) => set("customerName", event.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="f-email">Customer email</Label>
                  <Input id="f-email" type="email" value={editing.draft.customerEmail} onChange={(event) => set("customerEmail", event.target.value)} placeholder="Receives updates and sees this shipment in their account" />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-3 sm:col-span-2">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={editing.draft.live} onChange={(event) => set("live", event.target.checked)} />
                  <span className="text-sm">
                    <span className="font-semibold">Move automatically</span>
                    <span className="block text-[color:var(--muted-foreground)]">
                      Position, status and arrival time follow the real travel time between the two cities. Turn off to set the status and location yourself.
                    </span>
                  </span>
                </label>

                {editing.draft.live ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="f-depart">Departure time</Label>
                    <Input id="f-depart" type="datetime-local" value={editing.draft.departedAt} onChange={(event) => set("departedAt", event.target.value)} />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="f-status">Status</Label>
                      <select id="f-status" className={selectClass} value={editing.draft.status} onChange={(event) => set("status", event.target.value)}>
                        {MANUAL_STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="f-loc">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" />
                        Current location
                      </Label>
                      <Input id="f-loc" value={editing.draft.lastLocation} onChange={(event) => set("lastLocation", event.target.value)} placeholder="City, country" />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : editing.isNew ? "Create shipment" : "Save changes"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.trackingNumber}?</DialogTitle>
            <DialogDescription>The shipment and its history are removed. The tracking number will stop working. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="tabular font-display text-3xl font-extrabold text-[color:var(--ink-strong)]">{value}</dd>
    </div>
  );
}
