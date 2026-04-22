import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_18px_45px_rgba(255,127,41,0.35)] hover:translate-y-[-1px] hover:brightness-105",
        secondary:
          "bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)] hover:bg-[color:var(--secondary-strong)]",
        outline:
          "border border-[color:var(--border)] bg-white/5 text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:bg-white/8",
        ghost:
          "text-[color:var(--foreground)] hover:bg-white/8",
        destructive:
          "bg-[color:var(--danger)] text-white shadow-[0_16px_35px_rgba(190,45,66,0.35)] hover:brightness-110",
        frosted:
          "border border-white/12 bg-white/7 text-white backdrop-blur-xl hover:bg-white/12"
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
