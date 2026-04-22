import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-[color:var(--border)] bg-white/4 px-4 py-2 text-sm text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors placeholder:text-[color:var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
