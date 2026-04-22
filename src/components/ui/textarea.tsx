import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full rounded-[24px] border border-[color:var(--border)] bg-white/4 px-4 py-3 text-sm text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors placeholder:text-[color:var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
