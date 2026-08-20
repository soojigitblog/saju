/** Decorative hero illustration — CSS/SVG only, no stock images */
export function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[4/5] w-full max-w-[280px] ${className}`}
      aria-hidden
    >
      {/* Outer frame — traditional window */}
      <div className="absolute inset-0 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] shadow-[var(--shadow-deep),var(--glow-warm)]">
        {/* Night sky */}
        <div className="absolute inset-2 overflow-hidden rounded-md bg-gradient-to-b from-[#0a1520] via-[#0d1a28] to-[#121820]">
          {/* Stars */}
          {[
            { top: "12%", left: "20%", delay: "0s" },
            { top: "8%", left: "65%", delay: "1.2s" },
            { top: "22%", left: "45%", delay: "0.6s" },
            { top: "18%", left: "80%", delay: "2s" },
            { top: "30%", left: "15%", delay: "1.5s" },
          ].map((s, i) => (
            <span
              key={i}
              className="animate-twinkle absolute h-1 w-1 rounded-full bg-[var(--gold-soft)]"
              style={{ top: s.top, left: s.left, animationDelay: s.delay }}
            />
          ))}

          {/* Moon */}
          <div className="absolute right-[18%] top-[10%] h-14 w-14 rounded-full bg-gradient-to-br from-[var(--gold-soft)] to-[var(--gold)] opacity-80 shadow-[0_0_24px_rgba(212,175,112,0.3)]" />

          {/* Mountains silhouette */}
          <svg
            className="absolute bottom-[28%] left-0 w-full"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60 L40 25 L80 45 L120 15 L160 40 L200 20 L200 60 Z"
              fill="rgba(16,24,32,0.9)"
            />
            <path
              d="M0 60 L60 35 L100 50 L140 30 L200 45 L200 60 Z"
              fill="rgba(21,26,31,0.95)"
            />
          </svg>

          {/* Candle glow */}
          <div className="animate-candle absolute bottom-[32%] left-[22%] h-8 w-8 rounded-full bg-[radial-gradient(circle,rgba(212,175,112,0.5),transparent_70%)]" />
          <div className="absolute bottom-[30%] left-[24%] h-6 w-1 rounded-full bg-gradient-to-t from-[var(--gold)] to-[var(--gold-soft)] opacity-90" />

          {/* Scroll / book at bottom */}
          <div className="absolute bottom-3 left-1/2 w-[75%] -translate-x-1/2">
            <div className="rounded-sm border border-[var(--line)] bg-gradient-to-b from-[#1a1814] to-[#0f0e0c] px-3 py-4 shadow-lg">
              <div className="mb-2 flex justify-center gap-3">
                {["命", "運", "財"].map((h) => (
                  <span key={h} className="hanja-accent text-[10px]">
                    {h}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-0.5 w-full rounded bg-[var(--line)]" />
                <div className="h-0.5 w-4/5 rounded bg-[var(--line)] opacity-60" />
                <div className="h-0.5 w-full rounded bg-[var(--line)] opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corner ornaments */}
      <span className="absolute -left-1 -top-1 h-3 w-3 border-l border-t border-[var(--gold)] opacity-60" />
      <span className="absolute -right-1 -top-1 h-3 w-3 border-r border-t border-[var(--gold)] opacity-60" />
      <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b border-l border-[var(--gold)] opacity-60" />
      <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b border-r border-[var(--gold)] opacity-60" />
    </div>
  );
}
