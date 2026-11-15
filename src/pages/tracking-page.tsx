import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MessageSquareText, PackageSearch, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { JourneyCard } from "@/components/journey-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Shipment, SupportMessage, TrackResult, TrackingMode } from "@/types";

const modeCopy: Record<TrackingMode, { label: string; hint: string; placeholder: string }> = {
  tracking: {
    label: "Tracking number",
    hint: "Enter up to 30 shipment identifiers. One value per line or comma-separated.",
    placeholder: "TRK-LOS-101"
  },
  reference: {
    label: "Reference number",
    hint: "Use the customer reference when the tracking number is not available yet.",
    placeholder: "REF-INTL-1001"
  },
  tcn: {
    label: "Transportation Control Number",
    hint: "Search by TCN when routing shipments through enterprise workflows.",
    placeholder: "TCN-99450001"
  },
  pod: {
    label: "Tracking number for proof of delivery",
    hint: "Retrieve delivery confirmation from a shipment that has already completed.",
    placeholder: "TRK-SYD-112"
  }
};

const examples: Array<{ mode: TrackingMode; label: string; value: string }> = [
  { mode: "tracking", label: "Lagos → London", value: "TRK-LOS-101" },
  { mode: "tracking", label: "Shanghai → Los Angeles", value: "TRK-SHA-102" },
  { mode: "tracking", label: "Dubai → Sydney", value: "TRK-DXB-103" },
  { mode: "tracking", label: "New York → Boston", value: "TRK-NYC-001" },
  { mode: "pod", label: "Delivered (proof)", value: "TRK-SYD-112" }
];

export function TrackingPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<TrackingMode>((searchParams.get("mode") as TrackingMode) || "tracking");
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackResult[]>([]);
  const [selectedTracking, setSelectedTracking] = useState("");
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportDraft, setSupportDraft] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [myShipments, setMyShipments] = useState<Shipment[]>([]);
  const [requestDraft, setRequestDraft] = useState({
    origin: "",
    destination: "",
    notes: ""
  });
  const [requestSaving, setRequestSaving] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const lastSearched = useRef("");

  useEffect(() => {
    if (user) {
      void loadMyShipments();
    } else {
      setMyShipments([]);
    }
  }, [user]);

  useEffect(() => {
    const query = searchParams.get("q") || "";
    const nextMode = (searchParams.get("mode") as TrackingMode) || "tracking";
    setMode(nextMode);
    if (query && (query !== input || results.length === 0)) {
      setInput(query);
      if (query !== lastSearched.current) {
        lastSearched.current = query;
        void performSearch(query, nextMode);
      }
    }
  }, [searchParams]);

  // Live refresh: re-query the current results every 5s without touching the UI state.
  useEffect(() => {
    const queries = results.filter((item) => item.found).map((item) => item.query);
    if (!queries.length) return;

    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        const response = await api.trackShipments(mode, queries);
        setResults(response.results || []);
        setLastSync(new Date());
      } catch (_error) {
        /* keep showing the last known position */
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [results.map((item) => item.query).join("|"), mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedTracking) {
      setSupportMessages([]);
      return;
    }

    void loadSupportMessages(selectedTracking);
    const timer = window.setInterval(() => {
      void loadSupportMessages(selectedTracking);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [selectedTracking]);

  async function loadMyShipments() {
    try {
      const response = await api.getShipments("me");
      setMyShipments(response.shipments || []);
    } catch (_error) {
      setMyShipments([]);
    }
  }

  async function performSearch(rawInput = input, activeMode = mode) {
    const queries = rawInput
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 30);

    if (!queries.length) {
      toast.error("Enter at least one value to continue.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.trackShipments(activeMode, queries);
      setResults(response.results || []);
      setLastSync(new Date());
      const firstFound = (response.results || []).find((item) => item.found && item.shipment);
      if (firstFound?.shipment?.trackingNumber) {
        setSelectedTracking(firstFound.shipment.trackingNumber);
      }
      setSearchParams({
        mode: activeMode,
        q: rawInput
      });
      toast.success(`Loaded ${response.results?.length || 0} result${response.results?.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tracking failed.");
      setResults([]);
    } finally {
      setLoading(false);
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

  async function sendSupport() {
    if (!selectedTracking || !supportDraft.trim()) return;

    setSupportLoading(true);
    try {
      await api.sendSupportMessage({
        trackingNumber: selectedTracking,
        message: supportDraft.trim(),
        from: "user"
      });
      setSupportDraft("");
      await loadSupportMessages(selectedTracking);
      toast.success("Support message sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSupportLoading(false);
    }
  }

  async function submitShipmentRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      toast.error("Log in before requesting a shipment.");
      return;
    }

    setRequestSaving(true);
    try {
      const response = await api.requestShipment({
        origin: requestDraft.origin,
        destination: requestDraft.destination,
        lastLocation: requestDraft.origin,
        status: "Created",
        events: [
          {
            title: "Shipment request created",
            location: requestDraft.origin,
            details: requestDraft.notes || "Created from customer portal",
            timestamp: new Date().toISOString()
          }
        ]
      });
      setRequestDraft({ origin: "", destination: "", notes: "" });
      toast.success(`Shipment created: ${response.shipment.trackingNumber}`);
      await loadMyShipments();
      setSelectedTracking(response.shipment.trackingNumber);
      setResults([{ query: response.shipment.trackingNumber, found: true, shipment: response.shipment }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create shipment request.");
    } finally {
      setRequestSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_0.65fr]">
      <div className="space-y-6">
        <section className="rise relative overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[color:var(--brand-accent)]/12 blur-3xl" />
          <div className="relative space-y-6">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />
                Live tracking
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.02] text-[color:var(--ink-strong)] sm:text-5xl">
                Watch it move,
                <br />
                not just update.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)]">
                Positions are calculated from the real flight or road time between the two cities, so the vehicle keeps moving on the map
                between refreshes.
              </p>
            </div>

            <Tabs value={mode} onValueChange={(value) => setMode(value as TrackingMode)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="reference">Reference</TabsTrigger>
                <TabsTrigger value="tcn">TCN</TabsTrigger>
                <TabsTrigger value="pod">POD</TabsTrigger>
              </TabsList>
            </Tabs>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void performSearch();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="tracking-input">{modeCopy[mode].label}</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="tracking-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={modeCopy[mode].placeholder}
                    className="h-14 flex-1 text-base"
                  />
                  <Button size="lg" type="submit" disabled={loading} className="h-14 px-8">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
                    Track
                  </Button>
                </div>
                <p className="text-sm text-[color:var(--muted-foreground)]">{modeCopy[mode].hint}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">Try</span>
                {examples.map((example) => (
                  <button
                    key={`${example.mode}-${example.value}`}
                    type="button"
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--panel-subtle)] px-3.5 py-1.5 text-sm transition-colors hover:border-[color:var(--brand-primary)] hover:bg-white"
                    onClick={() => {
                      setMode(example.mode);
                      setInput(example.value);
                      void performSearch(example.value, example.mode);
                    }}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {results.some((item) => item.found) ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live — position refreshes every 5 seconds{lastSync ? ` · last sync ${lastSync.toLocaleTimeString()}` : ""}
                </span>
              ) : (
                "Search a tracking number to see its route on the map."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.length ? (
              results.map((result) =>
                result.found && result.shipment ? (
                  <JourneyCard
                    key={`${result.query}-${result.shipment.trackingNumber}`}
                    shipment={result.shipment}
                    onSupport={() => setSelectedTracking(result.shipment!.trackingNumber)}
                  />
                ) : (
                  <Card key={result.query} className="border-dashed">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{result.query}</p>
                          <p className="mt-2 font-semibold">No shipment matched this value.</p>
                        </div>
                        <Badge variant="danger">Not found</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              )
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-10 text-center">
                <p className="font-medium">No results yet.</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Search for a shipment to open timeline details and support actions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My parcels</CardTitle>
            <CardDescription>Signed-in users get quick access to their assigned shipments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user ? (
              myShipments.length ? (
                myShipments.map((shipment) => (
                  <button
                    key={shipment.trackingNumber}
                    type="button"
                    className="flex w-full items-center justify-between rounded-[22px] border border-white/8 bg-white/4 px-4 py-3 text-left transition-colors hover:bg-white/7"
                    onClick={() => {
                      setMode("tracking");
                      setInput(shipment.trackingNumber);
                      void performSearch(shipment.trackingNumber, "tracking");
                    }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{shipment.trackingNumber}</p>
                      <p className="mt-1 font-semibold">{shipment.destination}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </button>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">No parcels are assigned to your account yet.</p>
              )
            ) : (
              <p className="text-sm text-[color:var(--muted-foreground)]">Sign in from the header to load your shipments and request new ones.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request a shipment</CardTitle>
            <CardDescription>Create a new shipment request without leaving the tracking workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitShipmentRequest}>
              <div className="space-y-2">
                <Label htmlFor="request-origin">Origin</Label>
                <Input
                  id="request-origin"
                  placeholder="Memphis, TN"
                  value={requestDraft.origin}
                  onChange={(event) => setRequestDraft((current) => ({ ...current, origin: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-destination">Destination</Label>
                <Input
                  id="request-destination"
                  placeholder="Los Angeles, CA"
                  value={requestDraft.destination}
                  onChange={(event) => setRequestDraft((current) => ({ ...current, destination: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-notes">Notes</Label>
                <Textarea
                  id="request-notes"
                  placeholder="Packaging constraints, handoff notes, preferred delivery window..."
                  value={requestDraft.notes}
                  onChange={(event) => setRequestDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-[120px]"
                />
              </div>
              <Button className="w-full" type="submit" disabled={requestSaving}>
                {requestSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Submit shipment request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipment support</CardTitle>
            <CardDescription>
              {selectedTracking
                ? `Support thread for ${selectedTracking}.`
                : "Select a shipment result or personal parcel to open a support thread."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTracking ? (
              <>
                <div className="rounded-[24px] border border-white/8 bg-white/4 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Active thread</p>
                  <p className="mt-2 text-lg font-semibold">{selectedTracking}</p>
                </div>

                <div className="space-y-3">
                  {supportMessages.length ? (
                    supportMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-[22px] px-4 py-3 ${
                          message.from === "user"
                            ? "bg-[color:var(--accent)]/15 text-[color:var(--foreground)]"
                            : "border border-white/8 bg-white/4 text-[color:var(--foreground)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                            {message.from === "user" ? "You" : "Admin"}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">{formatRelativeTime(message.timestamp)}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6">{message.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">No support messages yet.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Textarea
                    value={supportDraft}
                    onChange={(event) => setSupportDraft(event.target.value)}
                    placeholder="Describe the issue, request an update, or ask for delivery confirmation..."
                    className="min-h-[110px]"
                  />
                  <Button className="w-full" onClick={() => void sendSupport()} disabled={supportLoading || !supportDraft.trim()}>
                    {supportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send support message
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-8 text-center">
                <MessageSquareText className="mx-auto h-8 w-8 text-[color:var(--muted-foreground)]" />
                <p className="mt-3 font-medium">Support stays tied to a shipment.</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Open a shipment result first so the thread stays attached to the correct tracking number.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
