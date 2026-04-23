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
  orange: "border-t-4 border-t-[color:var(--fedex-orange)]",
  blue: "border-t-4 border-t-[#0f5b8c]",
  green: "border-t-4 border-t-[#1c6630]",
  rose: "border-t-4 border-t-[#9f1f43]"
};

export function MetricCard({
  label,
  value,
  detail,
  accent = "orange",
  className
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden rounded-md", accents[accent], className)}>
      <CardContent className="p-4 text-center">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-foreground)]">{label}</p>
            <ArrowUpRight className="h-4 w-4 text-[color:var(--muted-foreground)]" />
          </div>
          <p className="text-4xl font-semibold leading-none text-[color:var(--foreground)]">{value}</p>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
