import { cn } from "@/lib/utils";

/** Premium fortune rating strip — not ecommerce stars. */
export function FortuneRatingStrip({
  scores,
  className,
}: {
  scores: Array<{ key: string; label: string; value: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className
      )}
    >
      {scores.map((s) => (
        <div
          key={s.key}
          className="border border-[var(--border-subtle)] bg-[var(--bg-primary)]/40 px-3 py-3 text-center"
        >
          <p className="text-[11px] tracking-wide text-[var(--text-muted)]">{s.label}</p>
          <div className="mt-2 flex items-center justify-center gap-0.5" aria-label={`${s.label} ${s.value}점`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className="text-sm"
                style={{
                  color:
                    i < s.value
                      ? "var(--gold-primary)"
                      : "rgba(212,168,79,0.2)",
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
