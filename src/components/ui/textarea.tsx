import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-28 w-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--border-gold)] focus-visible:outline-none focus-visible:shadow-[var(--glow-gold)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
