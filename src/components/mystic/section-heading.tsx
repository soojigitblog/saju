import { cn } from "@/lib/utils";
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {eyebrow ? <p className="hanja-accent mb-2">{eyebrow}</p> : null}
      <h2 className="display-title text-xl leading-snug md:text-2xl">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function GoldDivider({ className }: { className?: string }) {
  return <div className={cn("gold-divider", className)} role="presentation" />;
}

export function EvidenceBox({
  title = "왜 이렇게 보나요?",
  items,
  className,
}: {
  title?: string;
  items: string[];
  className?: string;
}) {
  const labels = formatFortuneEvidenceForDisplay(items);
  if (!labels.length) return null;
  return (
    <div
      className={cn(
        "mt-4 border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 px-4 py-3",
        className
      )}
    >
      <p className="text-[11px] tracking-[0.12em] text-[var(--gold-muted)]">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
        {labels.join(" · ")}
      </p>
    </div>
  );
}

export function KeywordTag({ children }: { children: React.ReactNode }) {
  return <span className="keyword-tag">{children}</span>;
}
