import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LifeBuoy, MapPinned, Radar, ShieldCheck, Sparkles } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import * as api from "@/lib/api";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { Shipment, Stats } from "@/types";

const defaults: Stats = {
  total: 0,
  inTransit: 0,
  delivered: 0,
  customers: 0
};

export function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(defaults);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const [statsResponse, shipmentsResponse] = await Promise.all([api.getStats(), api.getShipments()]);
      setStats(statsResponse);
      setShipments((shipmentsResponse.shipments || []).slice(0, 8));
    } catch (_error) {
      setStats(defaults);
      setShipments([]);
    }
  }

  const latestEvents = shipments
    .flatMap((shipment) =>
      shipment.events.slice(0, 1).map((event) => ({
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        location: event.location,
        title: event.title,
        timestamp: event.timestamp
      }))
    )
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 4);

  function submitHeroSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/track?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <Card className="overflow-hidden border-white/12">
          <CardContent className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,127,41,0.22),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(52,211,255,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_62%)]" />
            <div className="relative space-y-8">
              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">
                  <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                  Advanced dispatch portal
                </p>
                <div className="max-w-3xl space-y-4">
                  <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none sm:text-5xl lg:text-6xl">
                    One control surface for tracking, support, and live logistics.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
                    Search parcels instantly, inspect their latest scan history, monitor active lanes on a map, and move
                    operators through shipment updates without making them fight the interface.
                  </p>
                </div>
              </div>

              <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={submitHeroSearch}>
                <Input
                  placeholder="Enter a tracking number, reference, or TCN"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button size="lg" type="submit">
                  Search shipment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard accent="orange" label="Active parcels" value={stats.total} detail="Current records available to track." />
                <MetricCard accent="blue" label="In transit" value={stats.inTransit} detail="Live shipments moving through the network." />
                <MetricCard accent="green" label="Delivered" value={stats.delivered} detail="Proof-ready shipments completed in system." />
                <MetricCard accent="rose" label="Customers" value={stats.customers} detail="Distinct customers assigned to shipments." />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Network pulse</CardTitle>
              <CardDescription>Recent shipment activity pulled from the same API used by the tracking and admin views.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shipments.slice(0, 4).map((shipment) => (
                <Link
                  key={shipment.trackingNumber}
                  className="flex items-start justify-between gap-4 rounded-[24px] border border-white/8 bg-white/4 px-4 py-4 transition-colors hover:bg-white/7"
                  to={`/track?q=${encodeURIComponent(shipment.trackingNumber)}`}
                >
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{shipment.trackingNumber}</p>
                    <p className="text-lg font-semibold">{shipment.lastLocation}</p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      ETA {formatDateTime(shipment.estimatedDelivery)}
                    </p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </Link>
              ))}
              {!shipments.length ? <p className="text-sm text-[color:var(--muted-foreground)]">No shipment data available yet.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operator shortcuts</CardTitle>
              <CardDescription>Jump directly to the view that fits the task instead of drilling through generic pages.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ShortcutCard
                icon={Radar}
                title="Tracking workspace"
                body="Search by tracking, reference, TCN, or POD request and open a support thread from the result."
                to="/track"
              />
              <ShortcutCard
                icon={MapPinned}
                title="Live operations"
                body="Inspect moving shipments and vehicle positions on a shared map with refresh controls."
                to="/operations"
              />
              <ShortcutCard
                icon={ShieldCheck}
                title="Admin console"
                body="Create parcels fast, update locations, review support inbox activity, and edit shipment details."
                to="/admin"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Why this redesign is different</CardTitle>
            <CardDescription>The goal was not cosmetic parity. The goal was reducing operator friction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FeatureBullet
              icon={Radar}
              title="Fewer dead ends"
              body="Shipment tracking, support, and admin actions live in one routed client instead of isolated static pages."
            />
            <FeatureBullet
              icon={MapPinned}
              title="Faster situational awareness"
              body="Operations now have a dedicated view for shipment geography and lane health instead of text-only lists."
            />
            <FeatureBullet
              icon={LifeBuoy}
              title="Support tied to context"
              body="Customer messages stay connected to the shipment thread they belong to, which removes lookup churn."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest movement log</CardTitle>
            <CardDescription>Recent scans and status changes across the current shipment set.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestEvents.map((item, index) => (
              <div key={`${item.trackingNumber}-${item.timestamp}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      {item.trackingNumber} · {item.location}
                    </p>
                  </div>
                  <div className="text-sm text-[color:var(--muted-foreground)]">
                    <p>{formatDateTime(item.timestamp)}</p>
                    <p>{formatRelativeTime(item.timestamp)}</p>
                  </div>
                </div>
                {index < latestEvents.length - 1 ? <Separator className="mt-4" /> : null}
              </div>
            ))}
            {!latestEvents.length ? <p className="text-sm text-[color:var(--muted-foreground)]">No recent events available.</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ShortcutCard({
  icon: Icon,
  title,
  body,
  to
}: {
  icon: typeof Radar;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link className="rounded-[24px] border border-white/8 bg-white/4 p-4 transition-colors hover:bg-white/7" to={to}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/8">
          <Icon className="h-5 w-5 text-[color:var(--accent)]" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{body}</p>
        </div>
      </div>
    </Link>
  );
}

function FeatureBullet({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Radar;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Icon className="h-4 w-4 text-[color:var(--accent)]" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{body}</p>
      </div>
    </div>
  );
}
