import { cn } from "@/lib/utils";

/** Subtle celestial SVG layer — stars, orbit, faint moon. */
export function CelestialBackground({
  className,
  intensity = "soft",
}: {
  className?: string;
  intensity?: "soft" | "rich";
}) {
  const opacity = intensity === "rich" ? 0.55 : 0.35;
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
      style={{ opacity }}
    >
      <svg
        className="absolute -right-8 top-4 h-48 w-48 text-[var(--gold-primary)] motion-safe:animate-slow-spin md:h-64 md:w-64"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
        <circle
          cx="100"
          cy="100"
          r="58"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.25"
          strokeDasharray="3 5"
        />
        <circle cx="100" cy="22" r="2" fill="currentColor" opacity="0.5" />
        <circle cx="168" cy="100" r="1.5" fill="currentColor" opacity="0.4" />
      </svg>
      <svg
        className="absolute -left-6 bottom-8 h-36 w-36 text-[var(--gold-light)]"
        viewBox="0 0 120 120"
        fill="none"
      >
        <path
          d="M78 28c-18 4-30 20-28 38 14-6 30-20 28-38z"
          fill="currentColor"
          opacity="0.12"
        />
        <circle cx="40" cy="70" r="1" fill="currentColor" opacity="0.5" className="animate-twinkle" />
        <circle cx="55" cy="50" r="0.8" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  );
}

export function MysticPage({
  children,
  className,
  rich = false,
}: {
  children: React.ReactNode;
  className?: string;
  rich?: boolean;
}) {
  return (
    <div className={cn("celestial-bg relative", className)}>
      <CelestialBackground intensity={rich ? "rich" : "soft"} />
      {children}
    </div>
  );
}
