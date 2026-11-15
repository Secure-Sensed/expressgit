import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Crosshair, Radio } from "lucide-react";

import { ModeLegend, ShipmentMap } from "@/components/shipment-map";
import { MODE_META, modeMeta } from "@/components/transport-icons";
import { useNow } from "@/hooks/use-now";
import * as api from "@/lib/api";
import { formatCountdown, liveState } from "@/lib/geo";
import { cn, formatStatusLabel } from "@/lib/utils";
import type { Shipment, TransportMode } from "@/types";

type Filter = "all" | "moving" | "delivered";

const city = (place: string) => place.split(",")[0].trim();

export function OperationsPage() {
  const [searchParams] = useSearchParams();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState(searchParams.get("tracking") || "");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [modes, setModes] = useState<Set<TransportMode>>(new Set());
  const now = useNow(1000);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getShipments();
        if (!cancelled) setShipments(response.shipments || []);
      } catch (_error) {
        /* keep the last good list */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const rows = useMemo(
    () => shipments.map((shipment) => ({ shipment, state: liveState(shipment, now) })),
    [shipments, now]
  );

  const visible = rows.filter(({ shipment, state }) => {
    if (filter === "moving" && state.phase === "delivered") return false;
    if (filter === "delivered" && state.phase !== "delivered") return false;
    if (modes.size && !modes.has((shipment.transportMode || "ground") as TransportMode)) return false;
    return true;
  });

  const counts = {
    flight: rows.filter((row) => row.state.phase === "in_transit").length,
    customs: rows.filter((row) => row.state.phase === "customs" || row.state.phase === "processing").length,
    delivery: rows.filter((row) => row.state.phase === "out_for_delivery").length,
    delivered: rows.filter((row) => row.state.phase === "delivered").length
  };

  const selectedShipment = shipments.find((shipment) => shipment.trackingNumber === selected) || null;

  function toggleMode(mode: TransportMode) {
    setModes((current) => {
      const next = new Set(current);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            <Radio className="h-3.5 w-3.5" />
            Live network
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-none text-[color:var(--ink-strong)] sm:text-5xl">Everything in motion</h1>
        </div>

        <dl className="grid grid-cols-4 gap-2 sm:gap-3">
          <Counter label="Moving" value={counts.flight} tone="primary" />
          <Counter label="Handling" value={counts.customs} />
          <Counter label="Delivering" value={counts.delivery} />
          <Counter label="Delivered" value={counts.delivered} tone="success" />
        </dl>
      </header>

      <div className="rise grid overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)] lg:grid-cols-[1fr_390px]" style={{ animationDelay: "80ms" }}>
        <div className="relative h-[520px] lg:h-[680px]">
          <ShipmentMap
            className="absolute inset-0"
            shipments={visible.map((row) => row.shipment)}
            selectedTracking={selected}
            focusSelected={Boolean(selected)}
            onSelect={setSelected}
          />

          <div className="glass absolute left-4 top-4 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 shadow-lg">
            {(Object.keys(MODE_META) as TransportMode[]).map((mode) => {
              const meta = MODE_META[mode];
              const active = modes.has(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleMode(mode)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    active ? "border-transparent text-white" : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--brand-primary)]"
                  )}
                  style={active ? { background: meta.color } : undefined}
                >
                  <meta.Icon size={13} />
                  {meta.short}
                </button>
              );
            })}
          </div>

          {selected ? (
            <button
              type="button"
              onClick={() => setSelected("")}
              className="glass absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--brand-primary)] shadow-lg transition-transform hover:scale-[1.03]"
            >
              <Crosshair className="h-4 w-4" />
              Show whole network
            </button>
          ) : (
            <div className="glass pointer-events-none absolute bottom-4 left-4 rounded-2xl px-4 py-2.5 shadow-lg">
              <ModeLegend />
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col border-t border-[color:var(--border)] lg:max-h-[680px] lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-[color:var(--border)] p-3">
            {(["all", "moving", "delivered"] as Filter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                  filter === value ? "bg-[color:var(--brand-primary)] text-white" : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)]"
                )}
              >
                {value}
              </button>
            ))}
            <span className="tabular ml-auto pr-1 text-xs text-[color:var(--muted-foreground)]">{visible.length} shown</span>
          </div>

          <ul className="flex-1 divide-y divide-[color:var(--border)] overflow-y-auto">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <li key={index} className="p-4">
                    <div className="skeleton h-11 w-full" />
                  </li>
                ))
              : visible.map(({ shipment, state }) => {
                  const meta = modeMeta(shipment.transportMode);
                  const active = shipment.trackingNumber === selected;
                  const delivered = state.phase === "delivered";
                  return (
                    <li key={shipment.trackingNumber}>
                      <button
                        type="button"
                        onClick={() => setSelected(shipment.trackingNumber)}
                        className={cn("group relative w-full px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--panel-subtle)]", active && "bg-[color:var(--panel-subtle)]")}
                      >
                        {active ? <span className="absolute inset-y-0 left-0 w-1 bg-[color:var(--brand-accent)]" /> : null}
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                            style={{ background: delivered ? "#15803d" : meta.color }}
                          >
                            <meta.Icon size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-[15px] font-bold leading-tight">
                              {city(shipment.origin)} <span className="font-normal text-[color:var(--muted-foreground)]">→</span> {city(shipment.destination)}
                            </p>
                            <p className="tabular truncate text-xs text-[color:var(--muted-foreground)]">
                              {shipment.trackingNumber} · {formatStatusLabel(state.phase as string)}
                            </p>
                          </div>
                          <p className="tabular shrink-0 text-right text-xs font-semibold text-[color:var(--brand-primary)]">
                            {delivered ? "Delivered" : formatCountdown(state.remainingMs)}
                          </p>
                        </div>
                        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
                          <div
                            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                            style={{ width: `${state.overall * 100}%`, background: delivered ? "#15803d" : meta.color }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
            {!loading && visible.length === 0 ? <li className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">Nothing matches these filters.</li> : null}
          </ul>

          {selectedShipment ? (
            <div className="border-t border-[color:var(--border)] bg-[color:var(--panel-subtle)] p-4">
              <Link
                to={`/track?q=${encodeURIComponent(selectedShipment.trackingNumber)}`}
                className="group inline-flex w-full items-center justify-between rounded-xl bg-[color:var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a2a42]"
              >
                Open full journey for {selectedShipment.trackingNumber}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: "primary" | "success" }) {
  return (
    <div className="min-w-[78px] rounded-2xl border border-[color:var(--border)] bg-white px-3.5 py-2.5 shadow-[var(--shadow-soft)]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">{label}</dt>
      <dd
        className={cn(
          "tabular font-display text-2xl font-extrabold leading-tight",
          tone === "primary" && "text-[color:var(--brand-primary)]",
          tone === "success" && "text-[color:var(--success)]"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
