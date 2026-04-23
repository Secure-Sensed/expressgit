import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MapPinned, MessageSquareText, PackageSearch, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { Shipment, SupportMessage, TrackResult, TrackingMode } from "@/types";

const modeCopy: Record<TrackingMode, { label: string; hint: string; placeholder: string }> = {
  tracking: {
    label: "Tracking number",
    hint: "Enter up to 30 shipment identifiers. One value per line or comma-separated.",
    placeholder: "771975185243"
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
    placeholder: "794848183811"
  }
};

const examples: Array<{ mode: TrackingMode; label: string; value: string }> = [
  { mode: "tracking", label: "Intl tracking", value: "771975185243" },
  { mode: "reference", label: "Reference", value: "REF-INTL-1001" },
  { mode: "tcn", label: "TCN", value: "TCN-99450001" },
  { mode: "pod", label: "Proof of delivery", value: "794848183811" }
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
    if (query && query !== input) {
      setInput(query);
      void performSearch(query, nextMode);
    }
  }, [searchParams]);

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
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Badge variant="muted" className="w-fit">
                  Tracking
                </Badge>
                <h1 className="text-4xl font-light leading-none sm:text-5xl">Track the way you want</h1>
                <p className="max-w-3xl text-xl leading-8 text-[color:var(--muted-foreground)]">
                  Need the status of your shipment or proof of delivery? Enter your tracking number or reference number below.
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
                  <Textarea
                    id="tracking-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={modeCopy[mode].placeholder}
                    className="min-h-[140px]"
                  />
                  <p className="text-sm text-[color:var(--muted-foreground)]">{modeCopy[mode].hint}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {examples.map((example) => (
                    <button
                      key={`${example.mode}-${example.value}`}
                      type="button"
                      className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm transition-colors hover:bg-white/8"
                      onClick={() => {
                        setMode(example.mode);
                        setInput(example.value);
                      }}
                    >
                      {example.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button size="lg" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
                    Search shipment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInput("");
                      setResults([]);
                      setSelectedTracking("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Every result carries route, timeline, and next actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.length ? (
              results.map((result) =>
                result.found && result.shipment ? (
                  <ResultCard
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

function ResultCard({
  shipment,
  onSupport
}: {
  shipment: Shipment;
  onSupport: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{shipment.trackingNumber}</p>
                <h3 className="font-[family-name:var(--font-display)] text-2xl">{shipment.origin} to {shipment.destination}</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">Last scan at {shipment.lastLocation}</p>
              </div>
              <StatusBadge status={shipment.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Reference" value={shipment.referenceNumber || "Not assigned"} />
              <InfoRow label="TCN" value={shipment.tcn || "Not assigned"} />
              <InfoRow label="Estimated delivery" value={formatDateTime(shipment.estimatedDelivery)} />
              <InfoRow label="Updated" value={formatRelativeTime(shipment.updatedAt || shipment.events[0]?.timestamp)} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={onSupport}>
                <MessageSquareText className="h-4 w-4" />
                Open support
              </Button>
              <Button variant="ghost" asChild>
                <Link to={`/operations?tracking=${encodeURIComponent(shipment.trackingNumber)}`}>
                  <MapPinned className="h-4 w-4" />
                  View on map
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/8 bg-white/4 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Latest timeline</p>
            <div className="mt-4 space-y-4">
              {shipment.events.slice(0, 4).map((event, index) => (
                <div key={`${event.timestamp}-${event.title}`} className="relative pl-6">
                  {index < shipment.events.slice(0, 4).length - 1 ? (
                    <span className="absolute left-2.5 top-6 h-[calc(100%+0.75rem)] w-px bg-white/10" />
                  ) : null}
                  <span className="absolute left-0 top-1.5 h-5 w-5 rounded-full border border-white/10 bg-[color:var(--accent)]/25" />
                  <div className="space-y-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {event.location} · {formatDateTime(event.timestamp)}
                    </p>
                    {event.details ? <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{event.details}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            {shipment.proofOfDelivery ? (
              <>
                <Separator className="my-5" />
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Proof of delivery</p>
                  <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                    Delivered to {shipment.proofOfDelivery.receivedBy || "recipient"} on{" "}
                    {formatDateTime(shipment.proofOfDelivery.deliveredAt || undefined)}.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
