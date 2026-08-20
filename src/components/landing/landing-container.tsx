/** Shared max-width wrapper for landing (desktop-wide like reference mockup) */
export function LandingContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 md:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}

/** Ornate gold corner frame for bottom CTA */
export function OrnateFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative border border-[var(--line-strong)] bg-[var(--paper)]/40 p-8 md:p-12 ${className}`}>
      <span className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[var(--gold)]" />
      <span className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[var(--gold)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[var(--gold)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[var(--gold)]" />
      {children}
    </div>
  );
}
