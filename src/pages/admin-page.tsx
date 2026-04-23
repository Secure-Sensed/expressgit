import { useEffect, useState } from "react";
import {
  Loader2,
  LogOut,
  MapPinned,
  PackagePlus,
  RefreshCcw,
  Send,
  Trash2,
  UserX
} from "lucide-react";
import { toast } from "sonner";

import { AdminOnboardingTour } from "@/components/admin-onboarding-tour";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import * as api from "@/lib/api";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { Shipment, Stats, SupportMessage, SupportThread, User } from "@/types";

const statsFallback: Stats = {
  total: 0,
  inTransit: 0,
  delivered: 0,
  customers: 0
};
const ADMIN_ONBOARDING_KEY = "fdx_admin_onboarded_v1";
const ADMIN_SHOW_ONBOARDING_KEY = "fdx_admin_show_onboarding_v1";

const presets = {
  Pending: {
    origin: "Memphis, TN",
    destination: "Atlanta, GA",
    lastLocation: "Memphis, TN",
    daysToDelivery: 3
  },
  "In Transit": {
    origin: "Indianapolis, IN",
    destination: "Newark, NJ",
    lastLocation: "Columbus, OH",
    daysToDelivery: 1
  },
  "Out for Delivery": {
    origin: "Dallas, TX",
    destination: "Austin, TX",
    lastLocation: "Austin, TX",
    daysToDelivery: 0
  },
  Delivered: {
    origin: "Indianapolis, IN",
    destination: "Atlanta, GA",
    lastLocation: "Atlanta, GA",
    daysToDelivery: 0,
    receivedBy: "Front Desk"
  },
  Exception: {
    origin: "Phoenix, AZ",
    destination: "Newark, NJ",
    lastLocation: "St. Louis, MO",
    daysToDelivery: 2
  }
} as const;

type PresetValue = {
  origin: string;
  destination: string;
  lastLocation: string;
  daysToDelivery: number;
  receivedBy?: string;
};

type Draft = ReturnType<typeof createDraftFromShipment>;
type NotificationState = {
  sent: boolean;
  skipped?: string;
  error?: string;
};

export function AdminPage() {
  const { admin, logout } = useAdminAuth();
  const [stats, setStats] = useState<Stats>(statsFallback);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTracking, setSelectedTracking] = useState("");
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportDraft, setSupportDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(() => createDraftFromShipment());
  const [quickStatus, setQuickStatus] = useState<keyof typeof presets>("In Transit");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState("");
  const [quickTrackingNumber, setQuickTrackingNumber] = useState("");
  const [quickLocation, setQuickLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quickWorking, setQuickWorking] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void loadDashboard(true);
  }, []);

  useEffect(() => {
    const forceShow = window.sessionStorage.getItem(ADMIN_SHOW_ONBOARDING_KEY) === "1";
    const seen = window.localStorage.getItem(ADMIN_ONBOARDING_KEY);
    if (forceShow || !seen) {
      setShowOnboarding(true);
    }
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = window.localStorage.getItem("fdx_admin_draft");
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setDraft(parsedDraft);
      } catch (error) {
        console.error("Failed to parse saved draft:", error);
      }
    }
  }, []);

  // Save draft to localStorage whenever it changes
  useEffect(() => {
    window.localStorage.setItem("fdx_admin_draft", JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    const selected = shipments.find((shipment) => shipment.trackingNumber === selectedTracking);
    if (selected) {
      setDraft(createDraftFromShipment(selected));
      setQuickTrackingNumber(selected.trackingNumber);
      setQuickLocation(selected.lastLocation || "");
      void loadSupportMessages(selected.trackingNumber);
    } else {
      setSupportMessages([]);
    }
  }, [selectedTracking, shipments]);

  async function loadDashboard(initial = false) {
    if (initial) {
      setLoading(true);
    }

    try {
      const [statsResponse, shipmentsResponse, usersResponse] = await Promise.all([
        api.getStats(),
        api.getShipments(),
        api.getUsers()
      ]);
      setStats(statsResponse);
      setShipments(shipmentsResponse.shipments || []);
      setUsers(usersResponse.users || []);

      if (!selectedTracking && shipmentsResponse.shipments?.[0]?.trackingNumber) {
        setSelectedTracking(shipmentsResponse.shipments[0].trackingNumber);
      }

      await loadThreads();
    } catch (error) {
      if (initial) {
        toast.error(error instanceof Error ? error.message : "Unable to load admin data.");
      }
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }

  async function loadThreads() {
    try {
      const response = await api.getSupportThreads();
      setThreads(response.threads || []);
    } catch (_error) {
      setThreads([]);
    }
  }

  async function loadSupportMessages(trackingNumber: string) {
    try {
      const response = await api.getSupportMessages(trackingNumber);
      setSupportMessages(response.messages || []);
    } catch (_error) {
      setSupportMessages([]);
    }
  }

  async function createQuickShipment() {
    setQuickWorking(true);
    try {
      const preset = presets[quickStatus] as PresetValue;
      const trackingNumber = generateTrackingNumber();
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + preset.daysToDelivery);

      const shipment: Partial<Shipment> = {
        trackingNumber,
        status: quickStatus,
        origin: preset.origin,
        destination: preset.destination,
        lastLocation: preset.lastLocation,
        customerEmail: quickCustomerEmail.trim().toLowerCase() || undefined,
        customerName: quickCustomerEmail ? quickCustomerEmail.split("@")[0].replace(/[._-]+/g, " ") : undefined,
        estimatedDelivery: estimatedDelivery.toISOString(),
        events: [
          {
            title: `Shipment marked as ${quickStatus}`,
            location: preset.lastLocation,
            details: "Generated from quick create",
            timestamp: new Date().toISOString()
          }
        ]
      };

      if (quickStatus === "Delivered" && preset.receivedBy) {
        shipment.proofOfDelivery = {
          deliveredAt: new Date().toISOString(),
          receivedBy: preset.receivedBy
        };
      }

      const response = await api.upsertShipment(shipment);
      toast.success(`Created shipment ${trackingNumber}`);
      reportNotification(response.notification);
      setQuickTrackingNumber(trackingNumber);
      setQuickLocation(preset.lastLocation);
      await loadDashboard();
      setSelectedTracking(trackingNumber);
      // Force update the draft with the new tracking number
      setDraft(prev => ({ ...prev, trackingNumber }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create shipment.");
    } finally {
      setQuickWorking(false);
    }
  }

  async function updateQuickLocation() {
    if (!quickTrackingNumber.trim() || !quickLocation.trim()) {
      toast.error("Tracking number and current location are required.");
      return;
    }

    setQuickWorking(true);
    try {
      const response = await api.updateShipmentLocation(
        {
          trackingNumber: quickTrackingNumber.trim().toUpperCase(),
          lastLocation: quickLocation.trim()
        }
      );
      toast.success("Live location updated.");
      reportNotification(response.notification);
      await loadDashboard();
      setSelectedTracking(quickTrackingNumber.trim().toUpperCase());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update shipment location.");
    } finally {
      setQuickWorking(false);
    }
  }

  async function saveShipment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Shipment> = {
        trackingNumber: draft.trackingNumber || generateTrackingNumber(),
        status: draft.status,
        origin: draft.origin,
        destination: draft.destination,
        lastLocation: draft.lastLocation,
        referenceNumber: draft.referenceNumber || undefined,
        tcn: draft.tcn || undefined,
        customerEmail: draft.customerEmail || undefined,
        customerName: draft.customerName || undefined,
        estimatedDelivery: draft.estimatedDelivery ? new Date(draft.estimatedDelivery).toISOString() : undefined,
        events: draft.eventTitle
          ? [
              {
                title: draft.eventTitle,
                location: draft.eventLocation || draft.lastLocation,
                details: draft.eventDetails,
                timestamp: new Date().toISOString()
              }
            ]
          : undefined,
        proofOfDelivery:
          draft.podDeliveredAt || draft.podReceivedBy
            ? {
                deliveredAt: draft.podDeliveredAt ? new Date(draft.podDeliveredAt).toISOString() : undefined,
                receivedBy: draft.podReceivedBy || undefined
              }
            : undefined
      };

      const response = await api.upsertShipment(payload);
      toast.success(`Shipment ${response.action}.`);
      reportNotification(response.notification);
      await loadDashboard();
      setSelectedTracking(response.shipment.trackingNumber);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save shipment.");
    } finally {
      setSaving(false);
    }
  }

  async function removeShipment() {
    if (!selectedTracking) {
      toast.error("Select a shipment first.");
      return;
    }

    if (!window.confirm(`Delete shipment ${selectedTracking}?`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.deleteShipment(selectedTracking);
      toast.success(`Shipment ${selectedTracking} deleted.`);
      setSelectedTracking("");
      setDraft(createDraftFromShipment());
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete shipment.");
    } finally {
      setDeleting(false);
    }
  }

  async function replyToSupport() {
    if (!selectedTracking || !supportDraft.trim()) {
      toast.error("Select a shipment and enter a message.");
      return;
    }

    setSupportLoading(true);
    try {
      await api.sendSupportMessage(
        {
          trackingNumber: selectedTracking,
          message: supportDraft.trim(),
          from: "admin"
        }
      );
      setSupportDraft("");
      await Promise.all([loadSupportMessages(selectedTracking), loadThreads()]);
      toast.success("Reply sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send support reply.");
    } finally {
      setSupportLoading(false);
    }
  }

  async function removeUser(email: string) {
    if (!window.confirm(`Remove user ${email}?`)) {
      return;
    }

    try {
      await api.deleteUser(email);
      toast.success(`Removed ${email}`);
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove user.");
    }
  }

  const filteredShipments = shipments.filter((shipment) => {
    const haystack = [
      shipment.trackingNumber,
      shipment.referenceNumber,
      shipment.tcn,
      shipment.origin,
      shipment.destination,
      shipment.lastLocation,
      shipment.customerEmail,
      shipment.customerName
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function reportNotification(state?: NotificationState) {
    if (!state) return;
    if (state.sent) {
      toast.success("Receiver email notification sent.");
      return;
    }
    if (state.error) {
      toast.error(`Email notification failed: ${state.error}`);
      return;
    }
    if (state.skipped === "missing-recipient") {
      toast.message("No receiver email found for this shipment.");
      return;
    }
    if (state.skipped === "email-not-configured") {
      toast.message("Email not configured. Set RESEND_API_KEY and MAIL_FROM to enable notifications.");
    }
  }

  async function logoutAdmin() {
    try {
      await logout();
      toast.success("Admin signed out.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  return (
    <div className="space-y-6">
      {showOnboarding && <AdminOnboardingTour onDismiss={() => setShowOnboarding(false)} />}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="orange" label="Total parcels" value={stats.total} detail="All shipments available to the admin console." />
        <MetricCard accent="blue" label="In transit" value={stats.inTransit} detail="Shipments currently moving through the network." />
        <MetricCard accent="green" label="Delivered" value={stats.delivered} detail="Completed shipments with delivery status." />
        <MetricCard accent="rose" label="Customers" value={stats.customers} detail="Distinct customer identities linked to shipments." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Admin console</CardTitle>
                <CardDescription>
                  {`Signed in as ${admin?.email || "admin"}. Create, update, and monitor shipments in one place.`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadDashboard(true)} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Refresh data
                </Button>
                <Button variant="outline" onClick={() => void logoutAdmin()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-[24px] border border-[#d7c8ff] bg-[#f1edf9] px-4 py-3 text-sm leading-6 text-[#5b2b95]">
                Shipment changes are persisted through the backend store (Supabase when configured) and remain visible in tracking, operations, and support views.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipment inventory</CardTitle>
              <CardDescription>Search and filter shipments, then open one to edit it in the detail pane.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <Input placeholder="Search tracking, customer, route, reference..." value={search} onChange={(event) => setSearch(event.target.value)} />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Exception">Exception</SelectItem>
                    <SelectItem value="Created">Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[520px] rounded-[24px] border border-white/8">
                <div className="space-y-2 p-3">
                  {filteredShipments.map((shipment) => (
                    <button
                      key={shipment.trackingNumber}
                      type="button"
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition-colors ${
                        shipment.trackingNumber === selectedTracking
                          ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/12"
                          : "border-white/8 bg-white/4 hover:bg-white/7"
                      }`}
                      onClick={() => setSelectedTracking(shipment.trackingNumber)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{shipment.trackingNumber}</p>
                          <p className="font-semibold">{shipment.origin} to {shipment.destination}</p>
                          <p className="text-sm text-[color:var(--muted-foreground)]">
                            {shipment.lastLocation} · {shipment.customerEmail || "Unassigned customer"}
                          </p>
                        </div>
                        <StatusBadge status={shipment.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support inbox</CardTitle>
              <CardDescription>Recent tracking-linked threads. Selecting a thread also focuses the shipment editor.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <ScrollArea className="h-[360px] rounded-[24px] border border-white/8">
                <div className="space-y-2 p-3">
                  {threads.length ? (
                    threads.map((thread) => (
                      <button
                        key={`${thread.trackingNumber}-${thread.timestamp}`}
                        type="button"
                        className={`w-full rounded-[22px] border px-4 py-3 text-left transition-colors ${
                          thread.trackingNumber === selectedTracking
                            ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/12"
                            : "border-white/8 bg-white/4 hover:bg-white/7"
                        }`}
                        onClick={() => setSelectedTracking(thread.trackingNumber)}
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{thread.trackingNumber}</p>
                        <p className="mt-2 text-sm font-medium">{thread.lastMessage}</p>
                        <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">{formatRelativeTime(thread.timestamp)}</p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                      No admin-visible support threads yet.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Focused thread</p>
                  <p className="mt-2 font-semibold">{selectedTracking || "None selected"}</p>
                </div>

                <ScrollArea className="h-[220px] rounded-[24px] border border-white/8">
                  <div className="space-y-3 p-3">
                    {supportMessages.length ? (
                      supportMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-[20px] px-4 py-3 ${
                            message.from === "admin" ? "bg-[color:var(--accent)]/15" : "border border-white/8 bg-white/4"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{message.from}</p>
                            <p className="text-xs text-[color:var(--muted-foreground)]">{formatRelativeTime(message.timestamp)}</p>
                          </div>
                          <p className="mt-2 text-sm leading-6">{message.body}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                        No messages loaded for this shipment.
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="space-y-3">
                  <Textarea
                    value={supportDraft}
                    onChange={(event) => setSupportDraft(event.target.value)}
                    placeholder="Reply with the latest shipment status, ETA, or escalation note..."
                    className="min-h-[120px]"
                  />
                  <Button className="w-full" onClick={() => void replyToSupport()} disabled={supportLoading || !supportDraft.trim()}>
                    {supportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send admin reply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registered users</CardTitle>
              <CardDescription>Local auth users stored by the backend cookie layer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.length ? (
                users.map((user) => (
                  <div key={user.email} className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/4 px-4 py-3">
                    <div>
                      <p className="font-medium">{user.name || "Unnamed user"}</p>
                      <p className="text-sm text-[color:var(--muted-foreground)]">{user.email}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void removeUser(user.email)}>
                      <UserX className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">No registered users were found.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick create</CardTitle>
              <CardDescription>Generate a parcel with a realistic preset, then continue editing it below if needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-status">Status</Label>
                  <Select value={quickStatus} onValueChange={(value) => setQuickStatus(value as keyof typeof presets)}>
                    <SelectTrigger id="quick-status">
                      <SelectValue placeholder="Select preset status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(presets).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-email">Customer email</Label>
                  <Input
                    id="quick-email"
                    placeholder="client@example.com"
                    value={quickCustomerEmail}
                    onChange={(event) => setQuickCustomerEmail(event.target.value)}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={() => void createQuickShipment()} disabled={quickWorking}>
                {quickWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                Generate parcel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live location update</CardTitle>
              <CardDescription>Use the selected shipment or type another tracking number and push a new scan location.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="quick-tracking">Tracking number</Label>
                <Input
                  id="quick-tracking"
                  placeholder="771975185243"
                  value={quickTrackingNumber}
                  onChange={(event) => setQuickTrackingNumber(event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="quick-location">Current location</Label>
                <Input
                  id="quick-location"
                  placeholder="Paris, FR"
                  value={quickLocation}
                  onChange={(event) => setQuickLocation(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button className="w-full" variant="secondary" onClick={() => void updateQuickLocation()} disabled={quickWorking}>
                  {quickWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
                  Update live location
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipment editor</CardTitle>
              <CardDescription>Full edit surface for the focused shipment, including metadata, event scan, and POD details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={saveShipment}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tracking number">
                    <Input
                      value={draft.trackingNumber}
                      onChange={(event) => setDraft((current) => ({ ...current, trackingNumber: event.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </Field>
                  <Field label="Status">
                    <Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Created">Created</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Exception">Exception</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Origin">
                    <Input value={draft.origin} onChange={(event) => setDraft((current) => ({ ...current, origin: event.target.value }))} />
                  </Field>
                  <Field label="Destination">
                    <Input value={draft.destination} onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value }))} />
                  </Field>
                  <Field className="md:col-span-2" label="Current location">
                    <Input value={draft.lastLocation} onChange={(event) => setDraft((current) => ({ ...current, lastLocation: event.target.value }))} />
                  </Field>
                  <Field label="Reference number">
                    <Input value={draft.referenceNumber} onChange={(event) => setDraft((current) => ({ ...current, referenceNumber: event.target.value }))} />
                  </Field>
                  <Field label="TCN">
                    <Input value={draft.tcn} onChange={(event) => setDraft((current) => ({ ...current, tcn: event.target.value }))} />
                  </Field>
                  <Field label="Customer email">
                    <Input value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))} />
                  </Field>
                  <Field label="Customer name">
                    <Input value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} />
                  </Field>
                  <Field label="Estimated delivery">
                    <Input
                      type="datetime-local"
                      value={draft.estimatedDelivery}
                      onChange={(event) => setDraft((current) => ({ ...current, estimatedDelivery: event.target.value }))}
                    />
                  </Field>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field className="md:col-span-2" label="Latest event title">
                    <Input value={draft.eventTitle} onChange={(event) => setDraft((current) => ({ ...current, eventTitle: event.target.value }))} />
                  </Field>
                  <Field className="md:col-span-2" label="Latest event location">
                    <Input
                      value={draft.eventLocation}
                      onChange={(event) => setDraft((current) => ({ ...current, eventLocation: event.target.value }))}
                    />
                  </Field>
                  <Field className="md:col-span-2" label="Event details">
                    <Textarea
                      className="min-h-[120px]"
                      value={draft.eventDetails}
                      onChange={(event) => setDraft((current) => ({ ...current, eventDetails: event.target.value }))}
                    />
                  </Field>
                  <Field label="POD received by">
                    <Input
                      value={draft.podReceivedBy}
                      onChange={(event) => setDraft((current) => ({ ...current, podReceivedBy: event.target.value }))}
                    />
                  </Field>
                  <Field label="POD delivered at">
                    <Input
                      type="datetime-local"
                      value={draft.podDeliveredAt}
                      onChange={(event) => setDraft((current) => ({ ...current, podDeliveredAt: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save shipment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(createDraftFromShipment(shipments.find((shipment) => shipment.trackingNumber === selectedTracking)))}
                  >
                    Reset draft
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => void removeShipment()} disabled={deleting || !selectedTracking}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete shipment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focused shipment snapshot</CardTitle>
              <CardDescription>The currently selected shipment from the list or support inbox.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTracking ? (
                <>
                  <div className="flex items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Focused tracking</p>
                      <p className="mt-2 text-xl font-semibold">{selectedTracking}</p>
                    </div>
                    <StatusBadge status={draft.status} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Snapshot label="Origin" value={draft.origin || "Unknown"} />
                    <Snapshot label="Destination" value={draft.destination || "Unknown"} />
                    <Snapshot label="Current scan" value={draft.lastLocation || "Unknown"} />
                    <Snapshot label="ETA" value={draft.estimatedDelivery ? formatDateTime(new Date(draft.estimatedDelivery).toISOString()) : "Not set"} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">Select a shipment to see its snapshot.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function createDraftFromShipment(shipment?: Shipment | null) {
  const latestEvent = shipment?.events?.[0];
  return {
    trackingNumber: shipment?.trackingNumber || "",
    status: shipment?.status || "In Transit",
    origin: shipment?.origin || "",
    destination: shipment?.destination || "",
    lastLocation: shipment?.lastLocation || "",
    referenceNumber: shipment?.referenceNumber || "",
    tcn: shipment?.tcn || "",
    customerEmail: shipment?.customerEmail || "",
    customerName: shipment?.customerName || "",
    estimatedDelivery: shipment?.estimatedDelivery ? toDateTimeLocal(shipment.estimatedDelivery) : "",
    eventTitle: latestEvent?.title || "",
    eventLocation: latestEvent?.location || shipment?.lastLocation || "",
    eventDetails: latestEvent?.details || "",
    podReceivedBy: shipment?.proofOfDelivery?.receivedBy || "",
    podDeliveredAt: shipment?.proofOfDelivery?.deliveredAt ? toDateTimeLocal(shipment.proofOfDelivery.deliveredAt) : ""
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function generateTrackingNumber() {
  let output = "";
  for (let index = 0; index < 12; index += 1) {
    output += Math.floor(Math.random() * 10).toString();
  }
  return output;
}
