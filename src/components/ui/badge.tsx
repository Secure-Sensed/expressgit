import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/7 text-[color:var(--foreground)]",
        accent: "border-[color:var(--accent)]/30 bg-[color:var(--accent)]/15 text-[color:var(--accent)]",
        success: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
        danger: "border-rose-400/30 bg-rose-400/15 text-rose-200",
        muted: "border-white/8 bg-slate-500/10 text-slate-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
