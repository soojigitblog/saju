import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-deep)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm border border-[var(--gold-light)] bg-[var(--gold-primary)] !text-[var(--accent-foreground)] shadow-[var(--glow-gold)] hover:bg-[var(--gold-light)] hover:!text-[var(--accent-foreground)] active:scale-[0.98]",
        secondary:
          "rounded-sm border border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--ink)] hover:border-[var(--border-gold)] hover:bg-[var(--surface-hover)]",
        outline:
          "rounded-sm border border-[var(--border-gold)] bg-transparent text-[var(--gold-light)] hover:bg-[var(--accent-soft)]",
        ghost:
          "rounded-sm text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
        lock:
          "rounded-sm border border-[var(--gold-primary)] bg-[var(--surface-strong)] text-[var(--gold-soft)] hover:bg-[var(--accent-soft)] hover:shadow-[var(--glow-gold)]",
        parchment:
          "rounded-sm border border-[var(--gold-dim)] bg-gradient-to-b from-[var(--gold-light)] via-[var(--gold-primary)] to-[#b8903e] !text-[var(--accent-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_10px_rgba(0,0,0,0.3)] hover:brightness-105 hover:!text-[var(--accent-foreground)] active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-6 text-base",
        full: "h-14 w-full px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
