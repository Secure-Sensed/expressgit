import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { ShipmentMap } from "@/components/shipment-map";
import { CustomsIcon, MODE_META, ParcelIcon, PlaneIcon } from "@/components/transport-icons";
import type { TransportMode } from "@/types";

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/track?q=${encodeURIComponent(trimmed)}` : "/track");
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-[color:var(--brand-primary)] text-white">
        <div className="relative mx-auto grid max-w-[1220px] gap-10 px-4 pb-16 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <h1 className="font-display text-[40px] font-extrabold leading-[1.02] sm:text-[56px]">Track your shipment</h1>

            <p className="mt-5 max-w-[34rem] text-lg leading-8 text-white/75">
              Enter your tracking number to see where your package is, the route it is taking and when it is due to arrive.
            </p>

            <form className="mt-8 flex max-w-[34rem] flex-col gap-3 sm:flex-row" onSubmit={submit}>
              <label className="sr-only" htmlFor="home-track">
                Tracking number
              </label>
              <input
                id="home-track"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tracking number"
                className="h-14 w-full rounded-2xl border border-white/20 bg-white px-5 text-base text-[color:var(--foreground)] outline-none transition-shadow placeholder:text-[#8a96a0] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.35)] sm:flex-1"
              />
              <button
                type="submit"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[color:var(--brand-accent)] px-7 text-base font-bold text-[#2b1a00] transition-colors hover:bg-[#fbb52f]"
              >
                Track
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <p className="mt-4 text-sm text-white/60">
              Have an account?{" "}
              <Link className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white" to="/track">
                See your shipments
              </Link>
            </p>
          </div>

          <div className="relative h-[360px] overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.35)] sm:h-[460px]">
            <ShipmentMap className="absolute inset-0" shipments={[]} focusSelected={false} quiet />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-4 py-16">
        <h2 className="font-display text-3xl font-extrabold leading-tight text-[color:var(--ink-strong)] sm:text-4xl">How tracking works</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)]">
          Each shipment follows the route between its two cities at the normal speed of its transport mode. Time spent being processed,
          cleared through customs and delivered is added to the estimate.
        </p>

        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          <Step icon={ParcelIcon} title="Processing" text="Collected and checked at the origin before it leaves." />
          <Step icon={PlaneIcon} title="In transit" text="On its way. The position on the map follows the clock." />
          <Step icon={CustomsIcon} title="Customs" text="Cleared at the destination before delivery." />
          <Step icon={ParcelIcon} title="Delivery" text="On the final vehicle, then signed for." />
        </ol>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1220px] px-4">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-[color:var(--ink-strong)] sm:text-4xl">Transport modes</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(MODE_META) as TransportMode[]).map((mode) => {
              const meta = MODE_META[mode];
              const spec = MODE_SPEC[mode];
              return (
                <article key={mode} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-subtle)] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: meta.color }}>
                    <meta.Icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{meta.label}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">{spec.text}</p>
                  <dl className="tabular mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border)] pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-[color:var(--muted-foreground)]">Speed</dt>
                      <dd className="font-semibold">{spec.speed}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[color:var(--muted-foreground)]">Typical time</dt>
                      <dd className="font-semibold">{spec.door}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

const MODE_SPEC: Record<TransportMode, { speed: string; door: string; text: string }> = {
  express: { speed: "880 km/h", door: "1–2 days", text: "Priority air for urgent documents and parts." },
  air: { speed: "830 km/h", door: "1–3 days", text: "Scheduled air cargo between major hubs." },
  ground: { speed: "62 km/h", door: "Same day – 3 days", text: "Road freight within a country or region." },
  sea: { speed: "36 km/h", door: "2–6 weeks", text: "Ocean freight for bulk, non-urgent cargo." }
};

function Step({ icon: Icon, title, text }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; text: string }) {
  return (
    <li className="rounded-3xl border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-primary)] text-white">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">{text}</p>
    </li>
  );
}
