import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  accent?: "orange" | "blue" | "green" | "rose";
  className?: string;
}

const accents = {
  orange: "from-orange-500/30 to-orange-200/5",
  blue: "from-sky-500/30 to-sky-200/5",
  green: "from-emerald-500/30 to-emerald-200/5",
  rose: "from-rose-500/30 to-rose-200/5"
};

export function MetricCard({
  label,
  value,
  detail,
  accent = "orange",
  className
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="relative p-5">
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90", accents[accent])} />
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">{label}</p>
            <ArrowUpRight className="h-4 w-4 text-[color:var(--muted-foreground)]" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-4xl leading-none">{value}</p>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
