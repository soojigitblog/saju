import { cn } from "@/lib/utils";

type OrnamentCardProps = React.HTMLAttributes<HTMLDivElement> & {
  density?: "full" | "corners" | "none";
  glow?: boolean;
};

/** Premium ornamental panel — use on hero / signature / tarot highlights. */
export function OrnamentCard({
  className,
  children,
  density = "full",
  glow = false,
  ...props
}: OrnamentCardProps) {
  return (
    <div
      className={cn(
        "ornament-frame p-6 md:p-8",
        glow && "animate-soft-glow",
        className
      )}
      {...props}
    >
      {density !== "none" ? (
        <>
          <span className="ornament-frame__corner ornament-frame__corner--tl" />
          <span className="ornament-frame__corner ornament-frame__corner--tr" />
          <span className="ornament-frame__corner ornament-frame__corner--bl" />
          <span className="ornament-frame__corner ornament-frame__corner--br" />
        </>
      ) : null}
      {density === "full" ? (
        <>
          <span className="ornament-frame__diamond ornament-frame__diamond--top" />
          <span className="ornament-frame__diamond ornament-frame__diamond--bottom" />
        </>
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function ReportFrame({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <OrnamentCard className={cn("p-5 md:p-6", className)} density="corners" {...props}>
      {children}
    </OrnamentCard>
  );
}

export function MysticPanel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
