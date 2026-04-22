import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calculator, CircleDollarSign, HelpCircle, LocateFixed, PackageSearch, PackagePlus, UserRound } from "lucide-react";

import * as api from "@/lib/api";
import type { Stats } from "@/types";

type Mode = "rates" | "track" | "ship";

const defaultStats: Stats = {
  total: 0,
  inTransit: 0,
  delivered: 0,
  customers: 0
};

export function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("track");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<Stats>(defaultStats);

  useEffect(() => {
    void loadStats();
  }, []);

  async function loadStats() {
    try {
      const next = await api.getStats();
      setStats(next);
    } catch (_error) {
      setStats(defaultStats);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "track") {
      const trimmed = query.trim();
      if (!trimmed) return;
      navigate(`/track?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    if (mode === "ship") {
      navigate("/track");
      return;
    }

    navigate("/operations");
  }

  return (
    <div className="space-y-0">
      <section className="mx-auto max-w-[1220px] px-4 pb-14 pt-10">
        <div className="rounded-none bg-[#ececec] px-4 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-[760px]">
            <div className="grid grid-cols-3 overflow-hidden border border-[#e1e1e1] bg-[#efefef]">
              <ModeButton
                active={mode === "rates"}
                icon={Calculator}
                label="RATE & TRANSIT TIMES"
                onClick={() => setMode("rates")}
              />
              <ModeButton
                active={mode === "track"}
                icon={PackageSearch}
                label="TRACK"
                onClick={() => setMode("track")}
              />
              <ModeButton
                active={mode === "ship"}
                icon={PackagePlus}
                label="SHIP"
                onClick={() => setMode("ship")}
              />
            </div>

            <form className="mt-10 grid gap-3 sm:grid-cols-[1fr_200px]" onSubmit={submit}>
              <input
                className="h-[68px] border border-[#9b9b9b] bg-white px-4 text-lg font-normal italic text-[#777] outline-none focus:border-[color:var(--fedex-purple)] md:text-xl"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={mode === "track" ? "TRACKING ID" : mode === "ship" ? "SHIPMENT REFERENCE" : "DESTINATION"}
                value={query}
              />
              <button
                className="inline-flex h-[68px] items-center justify-center gap-3 bg-[color:var(--fedex-orange)] px-6 text-lg font-semibold uppercase tracking-[0.02em] text-white transition-opacity hover:opacity-95 md:text-2xl"
                type="submit"
              >
                {mode === "track" ? "Track" : mode === "ship" ? "Ship" : "Check"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1220px] grid-cols-1 px-4 md:grid-cols-[1fr_320px]">
        <div className="flex min-h-[132px] items-center gap-5 bg-[color:var(--fedex-purple)] px-8 text-white">
          <div className="hidden h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 md:flex">
            <PackageSearch className="h-8 w-8" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-tight md:text-[38px]">Sign up now to enjoy personalized shipping rates!</p>
            <p className="mt-2 text-base text-white/85 md:text-2xl">
              Benefit from our services and solutions designed to meet all of your shipping needs.
            </p>
          </div>
        </div>
        <div className="flex min-h-[132px] items-center justify-center bg-[#ececec] px-4">
          <button className="h-[62px] w-full max-w-[260px] rounded-full border-[3px] border-[color:var(--fedex-purple)] bg-transparent px-4 text-sm font-semibold uppercase tracking-[0.04em] text-[color:var(--fedex-purple)] transition-colors hover:bg-[#f6f2ff] md:text-lg">
            Open an account
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-4 pb-10 pt-14 text-center">
        <h2 className="text-4xl font-normal text-[color:var(--fedex-purple)] md:text-6xl">Manage your shipments</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          <ManageCard icon={UserRound} label="Schedule pickup" value={`${stats.customers} customers`} />
          <ManageCard icon={LocateFixed} label="Find locations" value={`${stats.inTransit} in transit`} />
          <ManageCard icon={CircleDollarSign} label="Fuel surcharge" value={`${stats.total} active`} />
          <ManageCard icon={HelpCircle} label="FAQs" value={`${stats.delivered} delivered`} />
        </div>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-[184px] flex-col items-center justify-center gap-3 px-3 text-center text-xs font-semibold tracking-[0.02em] transition-colors sm:text-sm md:text-[32px] ${
        active
          ? "bg-[color:var(--fedex-purple)] text-white"
          : "bg-[#efefef] text-[#2f2f2f] hover:bg-[#e6e6e6]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-10 w-10" />
      <span>{label}</span>
    </button>
  );
}

function ManageCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-4">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-[color:var(--fedex-purple)] bg-white text-[color:var(--fedex-purple)]">
        <Icon className="h-12 w-12" />
      </div>
      <p className="text-lg font-semibold uppercase tracking-[0.04em] text-[#0071bc] md:text-[34px]">{label}</p>
      <p className="text-sm text-[color:var(--muted-foreground)] md:text-[27px]">{value}</p>
    </div>
  );
}
