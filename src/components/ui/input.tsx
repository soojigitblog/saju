import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-12 w-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-base text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--border-gold)] focus-visible:outline-none focus-visible:shadow-[var(--glow-gold)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
