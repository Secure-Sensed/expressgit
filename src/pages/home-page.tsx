import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, Globe2, PackageSearch, Radar, ShieldCheck } from "lucide-react";

import { ModeLegend, ShipmentMap } from "@/components/shipment-map";
import { CustomsIcon, MODE_META, ParcelIcon, PlaneIcon, RouteIcon, modeMeta } from "@/components/transport-icons";
import { useNow } from "@/hooks/use-now";
import * as api from "@/lib/api";
import { liveState } from "@/lib/geo";
import type { Shipment, TransportMode } from "@/types";

const city = (place: string) => place.split(",")[0].trim();

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const now = useNow(1000);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await api.getShipments();
        if (!cancelled) setShipments(response.shipments || []);
      } catch (_error) {
        /* the hero still works without the list */
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const rows = useMemo(() => shipments.map((shipment) => ({ shipment, state: liveState(shipment, now) })), [shipments, now]);
  const moving = rows.filter((row) => row.state.phase === "in_transit");
  const cities = new Set(shipments.flatMap((shipment) => [city(shipment.origin), city(shipment.destination)])).size;
  const kmInMotion = moving.reduce((total, row) => total + (row.shipment.motion?.distanceKm || 0), 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/track?q=${encodeURIComponent(trimmed)}` : "/track");
  }

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-[color:var(--brand-primary)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "26px 26px" }}
        />
        <div className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-[color:var(--brand-accent)]/18 blur-[110px]" />

        <div className="relative mx-auto grid max-w-[1220px] gap-10 px-4 pb-16 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.1)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {moving.length ? `${moving.length} shipments moving right now` : "Live shipment network"}
            </p>

            <h1 className="rise mt-6 font-display text-[44px] font-extrabold leading-[0.98] sm:text-[64px]" style={{ animationDelay: "80ms" }}>
              Every parcel,
              <br />
              <span className="text-[color:var(--brand-accent)]">on the map</span> while
              <br />
              it travels.
            </h1>

            <p className="rise mt-6 max-w-[34rem] text-lg leading-8 text-white/75" style={{ animationDelay: "160ms" }}>
              Track air, express and road shipments in real time. Positions come from the true travel time between cities, so you see
              exactly where your package is and when it lands.
            </p>

            <form className="rise mt-8 flex max-w-[34rem] flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }} onSubmit={submit}>
              <label className="sr-only" htmlFor="home-track">
                Tracking number
              </label>
              <input
                id="home-track"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tracking number, e.g. TRK-LOS-101"
                className="h-14 flex-1 rounded-2xl border border-white/20 bg-white px-5 text-base text-[color:var(--foreground)] outline-none transition-shadow placeholder:text-[#8a96a0] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.35)]"
              />
              <button
                type="submit"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[color:var(--brand-accent)] px-7 text-base font-bold text-[#2b1a00] transition-colors hover:bg-[#fbb52f]"
              >
                Track
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            {moving.length ? (
              <p className="rise mt-4 text-sm text-white/60" style={{ animationDelay: "320ms" }}>
                Try{" "}
                {moving.slice(0, 3).map((row, index) => (
                  <span key={row.shipment.trackingNumber}>
                    {index ? ", " : ""}
                    <Link className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white" to={`/track?q=${row.shipment.trackingNumber}`}>
                      {row.shipment.trackingNumber}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>

          <div className="rise relative" style={{ animationDelay: "200ms" }}>
            <div className="relative h-[420px] overflow-hidden rounded-[32px] border border-white/15 bg-white shadow-[0_40px_90px_rgba(0,0,0,0.38)] sm:h-[520px]">
              <ShipmentMap className="absolute inset-0" shipments={shipments} focusSelected={false} quiet />
              <div className="glass pointer-events-none absolute bottom-3 left-3 rounded-2xl px-3.5 py-2 text-[color:var(--foreground)] shadow-lg">
                <ModeLegend />
              </div>
            </div>
            <Link
              to="/operations"
              className="glass absolute right-4 top-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-[color:var(--brand-primary)] shadow-xl transition-transform hover:-translate-y-0.5"
            >
              <Radar className="h-4 w-4" />
              Open live network
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Route ticker ---------- */}
      {rows.length ? (
        <section className="overflow-hidden border-b border-[color:var(--border)] bg-white py-3.5" aria-label="Shipments in the network">
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={copy === 1}>
                {rows.map(({ shipment, state }) => {
                  const meta = modeMeta(shipment.transportMode);
                  return (
                    <li key={shipment.trackingNumber}>
                      <Link
                        to={`/track?q=${shipment.trackingNumber}`}
                        tabIndex={copy === 1 ? -1 : 0}
                        className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-[color:var(--border)] bg-[color:var(--panel-subtle)] py-1.5 pl-2 pr-4 text-sm transition-colors hover:border-[color:var(--brand-primary)]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: meta.color }}>
                          <meta.Icon size={13} />
                        </span>
                        <span className="font-semibold">
                          {city(shipment.origin)} → {city(shipment.destination)}
                        </span>
                        <span className="tabular text-[color:var(--muted-foreground)]">{Math.round(state.overall * 100)}%</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Numbers ---------- */}
      <section className="mx-auto max-w-[1220px] px-4 py-14">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Figure icon={PlaneIcon} label="Moving now" value={moving.length} />
          <Figure icon={Globe2} label="Cities connected" value={cities} />
          <Figure icon={RouteIcon} label="Km in motion" value={kmInMotion} />
          <Figure icon={ParcelIcon} label="Shipments tracked" value={shipments.length} />
        </dl>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="mx-auto max-w-[1220px] px-4 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">How the clock works</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] text-[color:var(--ink-strong)] sm:text-5xl">
            Real distances. Real travel time.
          </h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--muted-foreground)]">
            Each shipment follows the great-circle route between its cities at the cruising speed of its transport mode, plus the time it
            spends being processed, cleared and delivered.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          <Step n="01" icon={ParcelIcon} title="Picked up & processed" text="Collected, scanned and screened at the origin facility before departure." />
          <Step n="02" icon={PlaneIcon} title="Moving" text="Flown or driven along the route. Its marker advances with the clock, not with refreshes." />
          <Step n="03" icon={CustomsIcon} title="Customs" text="Cleared at the destination gateway before it is released for delivery." />
          <Step n="04" icon={Clock3} title="Last mile" text="On the final vehicle, signed for, and logged as proof of delivery." />
        </ol>
      </section>

      {/* ---------- Modes ---------- */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1220px] px-4">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] text-[color:var(--ink-strong)] sm:text-5xl">Pick the speed you need</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(MODE_META) as TransportMode[]).map((mode) => {
              const meta = MODE_META[mode];
              const spec = MODE_SPEC[mode];
              return (
                <article key={mode} className="group relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-subtle)] p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: meta.color }}>
                    <meta.Icon size={24} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold">{meta.label}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">{spec.text}</p>
                  <dl className="tabular mt-5 grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-[color:var(--muted-foreground)]">Cruise speed</dt>
                      <dd className="font-semibold">{spec.speed}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[color:var(--muted-foreground)]">Typical door-to-door</dt>
                      <dd className="font-semibold">{spec.door}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-[1220px] px-4 py-16">
        <div className="relative overflow-hidden rounded-[32px] bg-[color:var(--brand-primary)] px-8 py-12 text-white sm:px-14">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden>
            <path className="route-flow" d="M-20 220C180 40 420 20 820 150" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <path className="route-flow" d="M-20 120C220 -10 520 60 820 40" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Have a tracking number?</h2>
              <p className="mt-2 text-white/75">See the route, the countdown and every scan along the way.</p>
            </div>
            <Link to="/track" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-[color:var(--brand-accent)] px-7 text-base font-bold text-[#2b1a00] transition-colors hover:bg-[#fbb52f]">
              <PackageSearch className="h-5 w-5" />
              Track a shipment
            </Link>
          </div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[color:var(--muted-foreground)]">
          <ShieldCheck className="h-4 w-4" />
          Customer names and emails are never shown on public tracking.
        </p>
      </section>
    </div>
  );
}

const MODE_SPEC: Record<TransportMode, { speed: string; door: string; text: string }> = {
  express: { speed: "880 km/h", door: "1–2 days", text: "Priority uplift and short processing. Best for time-critical documents and parts." },
  air: { speed: "830 km/h", door: "1–3 days", text: "Scheduled air cargo between major hubs for heavier consignments." },
  ground: { speed: "62 km/h", door: "Same day – 3 days", text: "Road freight for regional and cross-country deliveries." },
  sea: { speed: "36 km/h", door: "2–6 weeks", text: "Ocean freight for bulk and low-urgency cargo at the lowest cost per kilo." }
};

function Figure({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <Icon size={22} className="text-[color:var(--accent-strong)]" />
      <dd className="tabular mt-4 font-display text-4xl font-extrabold leading-none text-[color:var(--ink-strong)]">{value.toLocaleString("en-US")}</dd>
      <dt className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">{label}</dt>
    </div>
  );
}

function Step({ n, icon: Icon, title, text }: { n: string; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; text: string }) {
  return (
    <li className="relative rounded-3xl border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--brand-primary)] text-white">
          <Icon size={22} />
        </span>
        <span className="tabular font-display text-3xl font-extrabold text-[color:var(--border)]">{n}</span>
      </div>
      <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">{text}</p>
    </li>
  );
}
