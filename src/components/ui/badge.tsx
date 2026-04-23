import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-[color:var(--border)] bg-[#f7f7f7] text-[color:var(--foreground)]",
        accent: "border-[#ffd4b9] bg-[#fff2e8] text-[#9f4708]",
        success: "border-[#c8e5cf] bg-[#eaf7ec] text-[#1c6630]",
        danger: "border-[#f6b5c5] bg-[#ffe9ee] text-[#9f1f43]",
        muted: "border-[#d7c8ff] bg-[#f1edf9] text-[#5b2b95]"
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
