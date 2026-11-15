import { useMemo } from "react";
import { CheckCircle2, CircleDot, Clock3, Gauge, Hourglass, MapPin, MessageSquareText, Route as RouteIcon } from "lucide-react";

import { ShipmentMap } from "@/components/shipment-map";
import { CustomsIcon, ParcelIcon, modeMeta } from "@/components/transport-icons";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, liveState } from "@/lib/geo";
import { cn, formatDateTime, formatStatusLabel } from "@/lib/utils";
import type { Shipment } from "@/types";

const PHASE_COPY: Record<string, string> = {
  scheduled: "Scheduled for pickup",
  processing: "Being processed at origin",
  in_transit: "On its way",
  customs: "Clearing customs",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered"
};

function cityOf(place: string) {
  return place.split(",")[0].trim();
}

export function JourneyCard({ shipment, onSupport }: { shipment: Shipment; onSupport?: () => void }) {
  const now = useNow(1000);
  const meta = modeMeta(shipment.transportMode);
  const state = liveState(shipment, now);
  const Icon = meta.Icon;
  const delivered = state.phase === "delivered";
  const live = Boolean(shipment.motion);

  return (
    <article className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
      {/* Header: route + status */}
      <header className="relative overflow-hidden bg-[color:var(--brand-primary)] px-6 pb-8 pt-6 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[color:var(--brand-accent)]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.14)] text-white">
              <Icon size={20} style={meta.rotates ? { transform: "rotate(45deg)" } : undefined} />
            </span>
            <div>
              <p className="tabular text-sm font-semibold tracking-[0.14em]">{shipment.trackingNumber}</p>
              <p className="text-xs text-white/70">{shipment.motion?.modeLabel || meta.label}</p>
            </div>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]",
              delivered ? "bg-emerald-400/20 text-emerald-100" : "bg-[color:var(--brand-accent)] text-[#3b2400]"
            )}
          >
            {delivered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />}
            {PHASE_COPY[state.phase as string] || formatStatusLabel(shipment.status)}
          </span>
        </div>

        <div className="relative mt-8 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">From</p>
            <p className="font-display text-3xl font-extrabold leading-none sm:text-5xl">{cityOf(shipment.origin)}</p>
            <p className="mt-1 text-sm text-white/65">{shipment.origin.split(",").slice(1).join(",").trim()}</p>
          </div>
          <RouteIcon className="mb-3 hidden h-7 w-7 text-white/50 sm:block" />
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">To</p>
            <p className="font-display text-3xl font-extrabold leading-none sm:text-5xl">{cityOf(shipment.destination)}</p>
            <p className="mt-1 text-sm text-white/65">{shipment.destination.split(",").slice(1).join(",").trim()}</p>
          </div>
        </div>

        <JourneyStrip shipment={shipment} overall={state.overall} phase={state.phase as string} />
      </header>

      {/* Live numbers */}
      <section className="grid grid-cols-2 divide-x divide-y divide-[color:var(--border)] border-b border-[color:var(--border)] sm:grid-cols-4 sm:divide-y-0">
        <Stat icon={Hourglass} label={delivered ? "Delivered" : "Arrives in"} value={delivered ? "Done" : formatCountdown(state.remainingMs)} emphasis />
        <Stat icon={Clock3} label="Estimated arrival" value={state.etaMs ? formatDateTime(new Date(state.etaMs).toISOString()) : "—"} />
        <Stat icon={MapPin} label="Distance left" value={state.remainingKm !== null ? `${state.remainingKm.toLocaleString("en-US")} km` : "—"} />
        <Stat
          icon={Gauge}
          label="Speed"
          value={shipment.motion ? (shipment.motion.speedKmh ? `${shipment.motion.speedKmh} km/h` : "Stationary") : "—"}
        />
      </section>

      {/* Map + timeline */}
      <section className="grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative min-h-[380px]">
          <ShipmentMap
            className="absolute inset-0"
            shipments={[shipment]}
            selectedTracking={shipment.trackingNumber}
            focusSelected
          />
          <div className="glass pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--brand-primary)] shadow">
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-500" />
            {live ? "Live position" : "Last reported position"}
          </div>
        </div>

        <Timeline shipment={shipment} />
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--panel-subtle)] px-6 py-4 text-sm sm:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[color:var(--muted-foreground)]">
          <span>
            Reference <strong className="tabular font-semibold text-[color:var(--foreground)]">{shipment.referenceNumber || "—"}</strong>
          </span>
          <span>
            Last scan <strong className="font-semibold text-[color:var(--foreground)]">{shipment.lastLocation}</strong>
          </span>
        </div>
        {onSupport ? (
          <Button variant="outline" onClick={onSupport}>
            <MessageSquareText className="h-4 w-4" />
            Ask about this shipment
          </Button>
        ) : null}
      </footer>

      {shipment.proofOfDelivery ? (
        <div className="border-t border-[color:var(--border)] bg-emerald-50 px-6 py-4 text-sm text-emerald-900 sm:px-8">
          <CheckCircle2 className="mr-2 inline h-4 w-4 align-[-3px]" />
          Delivered to <strong>{shipment.proofOfDelivery.receivedBy || "recipient"}</strong> on{" "}
          {formatDateTime(shipment.proofOfDelivery.deliveredAt || undefined)}. Signature: {shipment.proofOfDelivery.signature || "on file"}.
        </div>
      ) : null}
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  emphasis
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={cn("tabular mt-1.5 font-display font-bold leading-tight", emphasis ? "text-2xl text-[color:var(--brand-primary)] sm:text-3xl" : "text-base sm:text-lg")}>
        {value}
      </p>
    </div>
  );
}

// The journey as one bar. Segment widths are proportional to how long each stage takes, so a
// long flight looks long and customs looks short. The vehicle glides along it with the clock.
function JourneyStrip({ shipment, overall, phase }: { shipment: Shipment; overall: number; phase: string }) {
  const meta = modeMeta(shipment.transportMode);
  const Icon = meta.Icon;
  const motion = shipment.motion;

  const segments = useMemo(() => {
    if (!motion) return [{ key: "all", label: "Route", flex: 1, reached: overall }];
    const t = (iso: string) => Date.parse(iso);
    const total = t(motion.arrivesAt) - t(motion.departedAt);
    const parts = [
      { key: "processing", label: "Origin", from: t(motion.departedAt), to: t(motion.legStart) },
      { key: "in_transit", label: meta.short, from: t(motion.legStart), to: t(motion.legEnd) },
      { key: "customs", label: "Customs", from: t(motion.legEnd), to: t(motion.customsEnd) },
      { key: "out_for_delivery", label: "Delivery", from: t(motion.customsEnd), to: t(motion.arrivesAt) }
    ];
    return parts.map((part) => ({ key: part.key, label: part.label, flex: Math.max(0.04, (part.to - part.from) / total), from: part.from, to: part.to, total }));
  }, [motion, meta.short, overall]);

  const percent = Math.round(overall * 1000) / 10;

  return (
    <div className="relative mt-10">
      <div className="flex h-2.5 gap-1">
        {segments.map((segment) => {
          const s = segment as { key: string; label: string; flex: number; from?: number; to?: number; total?: number; reached?: number };
          let fill = 0;
          if (motion && s.from !== undefined && s.to !== undefined) {
            const nowMs = Date.parse(motion.departedAt) + overall * (Date.parse(motion.arrivesAt) - Date.parse(motion.departedAt));
            fill = Math.min(1, Math.max(0, (nowMs - s.from) / (s.to - s.from)));
          } else {
            fill = s.reached || 0;
          }
          return (
            <div key={s.key} className="relative overflow-hidden rounded-full bg-white/18" style={{ flex: s.flex }}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--brand-accent)]" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex gap-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white/60">
        {segments.map((segment) => (
          <span key={segment.key} className="truncate" style={{ flex: segment.flex }}>
            {segment.label}
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute -top-[15px] z-10 -translate-x-1/2 transition-[left] duration-1000 ease-linear"
        style={{ left: `${percent}%` }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-[color:var(--brand-primary)] shadow-lg">
          <span style={{ transform: meta.rotates ? "rotate(90deg)" : undefined, display: "flex" }}>
            {phase === "customs" ? <CustomsIcon size={18} /> : phase === "out_for_delivery" || phase === "delivered" ? <ParcelIcon size={18} /> : <Icon size={18} />}
          </span>
        </span>
      </div>
    </div>
  );
}

function Timeline({ shipment }: { shipment: Shipment }) {
  const events = shipment.events || [];

  return (
    <aside className="border-t border-[color:var(--border)] bg-[color:var(--panel-subtle)] p-6 lg:border-l lg:border-t-0">
      <h3 className="font-display text-lg font-bold">Journey log</h3>
      <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">Newest first — updates itself as the shipment moves.</p>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--muted-foreground)]">Nothing scanned yet.</p>
      ) : (
        <ol className="mt-5 space-y-0">
          {events.slice(0, 8).map((event, index) => {
            const latest = index === 0;
            return (
              <li key={`${event.timestamp}-${event.title}`} className="rise relative pb-5 pl-7" style={{ animationDelay: `${index * 70}ms` }}>
                {index < Math.min(events.length, 8) - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-[color:var(--border)]" /> : null}
                <span
                  className={cn(
                    "absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full",
                    latest ? "bg-[color:var(--brand-accent)] shadow-[0_0_0_4px_rgba(245,158,11,0.22)]" : "bg-[color:var(--brand-primary)]"
                  )}
                >
                  {latest ? null : <CircleDot className="h-2.5 w-2.5 text-white" />}
                </span>
                <p className={cn("text-sm leading-snug", latest ? "font-semibold" : "font-medium")}>{event.title}</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {event.location} · {formatDateTime(event.timestamp)}
                </p>
                {event.details && latest ? <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">{event.details}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
