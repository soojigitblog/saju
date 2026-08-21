import { cn } from "@/lib/utils";

/** Temporary brand mark — moon · star · celestial ring · 結. Swappable later. */
export function BrandMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn(className)}
    >
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="var(--gold-primary)"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle
        cx="24"
        cy="24"
        r="12"
        stroke="var(--gold-light)"
        strokeWidth="0.75"
        opacity="0.35"
        strokeDasharray="2 3"
      />
      {/* crescent */}
      <path
        d="M28 14c-6 1.5-10 7-9.5 13.5C24 25 30 20 28 14z"
        fill="var(--gold-primary)"
        opacity="0.75"
      />
      {/* star */}
      <path
        d="M34 18l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3L34 18z"
        fill="var(--gold-light)"
        opacity="0.85"
      />
      {/* center knot hint */}
      <circle cx="22" cy="28" r="2.2" stroke="var(--gold-light)" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}
