import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MessageSquareText, PackageSearch, Send } from "lucide-react";
import { toast } from "sonner";

import { JourneyCard } from "@/components/journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Shipment, SupportMessage, TrackResult, TrackingMode } from "@/types";

const modeCopy: Record<TrackingMode, { label: string; hint: string; placeholder: string }> = {
  tracking: {
    label: "Tracking number",
    hint: "You can enter up to 30 numbers, separated by commas or new lines.",
    placeholder: "Tracking number"
  },
  reference: {
    label: "Reference number",
    hint: "Use the reference number if you do not have a tracking number.",
    placeholder: "REF-…"
  },
  tcn: {
    label: "Transportation Control Number",
    hint: "Search by Transportation Control Number.",
    placeholder: "TCN-…"
  },
  pod: {
    label: "Tracking number for proof of delivery",
    hint: "Look up the delivery confirmation for a shipment that has arrived.",
    placeholder: "Tracking number"
  }
};

export function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<TrackingMode>((searchParams.get("mode") as TrackingMode) || "tracking");
  const [input, setInput] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackResult[]>([]);
  const [selectedTracking, setSelectedTracking] = useState("");
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportDraft, setSupportDraft] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const lastSearched = useRef("");

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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_0.65fr]">
      <div className="space-y-6">
        <section className="rise relative overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[color:var(--brand-accent)]/12 blur-3xl" />
          <div className="relative space-y-6">
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-[color:var(--ink-strong)] sm:text-5xl">Track a shipment</h1>
              <p className="max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)]">
                Enter a tracking number to see where it is, the route it is taking and when it is expected to arrive.
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
                    className="h-14 w-full text-base sm:flex-1"
                  />
                  <Button size="lg" type="submit" disabled={loading} className="h-14 px-8">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
                    Track
                  </Button>
                </div>
                <p className="text-sm text-[color:var(--muted-foreground)]">{modeCopy[mode].hint}</p>
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
                  Updates every 5 seconds{lastSync ? ` · last sync ${lastSync.toLocaleTimeString()}` : ""}
                </span>
              ) : (
                "Enter a tracking number to see its route."
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment support</CardTitle>
            <CardDescription>
              {selectedTracking
                ? `Support thread for ${selectedTracking}.`
                : "Open a shipment to message support about it."}
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
                    placeholder="Write your message"
                    className="min-h-[110px]"
                  />
                  <Button className="w-full" onClick={() => void sendSupport()} disabled={supportLoading || !supportDraft.trim()}>
                    {supportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send message
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-8 text-center">
                <MessageSquareText className="mx-auto h-8 w-8 text-[color:var(--muted-foreground)]" />
                <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">Search for a shipment first.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
