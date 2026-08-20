/** Slow-rotating bagua-inspired decorative ring */
export function BaguaSpinner({ size = 120 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        className="animate-slow-spin absolute inset-0 opacity-30"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="46" stroke="var(--gold)" strokeWidth="0.5" opacity="0.4" />
        <circle cx="50" cy="50" r="38" stroke="var(--gold)" strokeWidth="0.3" opacity="0.25" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="4"
            x2="50"
            y2="18"
            stroke="var(--gold)"
            strokeWidth="0.5"
            opacity="0.35"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
        <path
          d="M50 12 A38 38 0 0 1 88 50 L50 50 Z"
          fill="var(--gold)"
          opacity="0.08"
        />
        <path
          d="M50 88 A38 38 0 0 1 12 50 L50 50 Z"
          fill="var(--gold)"
          opacity="0.05"
        />
      </svg>
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)]">
        <span className="hanja-accent text-[11px] tracking-widest">命</span>
      </div>
    </div>
  );
}
