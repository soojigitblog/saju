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
          "rounded-md border border-[var(--gold-light)] bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)] !text-[var(--accent-foreground)] shadow-[var(--glow-gold)] hover:brightness-110 hover:!text-[var(--accent-foreground)] active:scale-[0.98]",
        secondary:
          "rounded-md border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-hover)]",
        outline:
          "rounded-md border border-[var(--line-strong)] bg-transparent text-[var(--gold-soft)] hover:bg-[var(--accent-soft)] hover:border-[var(--gold)]",
        ghost:
          "rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
        lock:
          "rounded-md border border-[var(--gold)] bg-[var(--surface-strong)] text-[var(--gold-soft)] hover:bg-[var(--accent-soft)] hover:shadow-[var(--glow-gold)]",
        parchment:
          "rounded-sm border border-[#c4b08a] bg-gradient-to-b from-[#ebe3d0] via-[#ddd0b4] to-[#c9b896] !text-[#1a1510] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(0,0,0,0.25)] hover:brightness-105 hover:!text-[#1a1510] active:scale-[0.98]",
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
