/** Large decorative Bagua + Yin-Yang for landing (reference mockup scale) */
export function BaguaLarge({ className = "" }: { className?: string }) {
  const trigrams = [
    { deg: 0, lines: [1, 1, 1] },
    { deg: 45, lines: [0, 1, 1] },
    { deg: 90, lines: [1, 0, 1] },
    { deg: 135, lines: [0, 0, 0] },
    { deg: 180, lines: [0, 0, 1] },
    { deg: 225, lines: [1, 0, 0] },
    { deg: 270, lines: [0, 1, 0] },
    { deg: 315, lines: [1, 1, 0] },
  ];

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[280px] md:max-w-[320px] ${className}`} aria-hidden>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        {/* outer ring */}
        <circle cx="100" cy="100" r="96" fill="none" stroke="var(--gold)" strokeWidth="0.75" opacity="0.35" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.2" />

        {/* trigram ticks */}
        {trigrams.map(({ deg, lines }) => (
          <g key={deg} transform={`rotate(${deg} 100 100)`}>
            {lines.map((solid, i) => (
              <rect
                key={i}
                x={solid ? 92 : 88}
                y={14 + i * 5}
                width={solid ? 16 : 8}
                height={2.5}
                fill="var(--gold)"
                opacity={0.45}
              />
            ))}
          </g>
        ))}

        {/* yin-yang */}
        <circle cx="100" cy="100" r="42" fill="var(--surface-strong)" opacity="0.9" />
        <path
          d="M100 58 A42 42 0 0 1 100 142 A21 21 0 0 0 100 100 A21 21 0 0 1 100 58"
          fill="var(--gold)"
          opacity="0.22"
        />
        <path
          d="M100 142 A42 42 0 0 1 100 58 A21 21 0 0 0 100 100 A21 21 0 0 1 100 142"
          fill="var(--paper)"
          opacity="0.85"
        />
        <circle cx="100" cy="79" r="5" fill="var(--gold)" opacity="0.55" />
        <circle cx="100" cy="121" r="5" fill="var(--ink-faint)" opacity="0.6" />

        {/* inner glow */}
        <circle cx="100" cy="100" r="42" fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.25" />
      </svg>
    </div>
  );
}
