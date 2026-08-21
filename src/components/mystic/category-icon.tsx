import type { QuestionCategory } from "@/lib/tarot/types";
import { cn } from "@/lib/utils";

/** Thin line icons for tarot question categories — no emoji, no flashy glyphs. */
export function CategoryIcon({
  category,
  className,
}: {
  category: QuestionCategory;
  className?: string;
}) {
  const common = "h-5 w-5 shrink-0 text-[var(--gold-muted)]";
  switch (category) {
    case "money":
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M12 8v8M9.5 10.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2 1.5-1 1.5-2.5 1.5S9.5 13 9.5 14s1.2 1.5 2.5 1.5 2-.5 2.5-1.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "career":
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="8" width="16" height="11" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "love":
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 19s-6.5-4.2-6.5-9A3.5 3.5 0 0 1 12 8.2 3.5 3.5 0 0 1 18.5 10c0 4.8-6.5 9-6.5 9z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      );
    case "relationships":
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 17.5c.8-2.2 2.6-3.5 4.5-3.5s3.7 1.3 4.5 3.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M13.5 16.5c.5-1.4 1.6-2.2 2.8-2.2 1.4 0 2.5.9 3 2.2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "advice":
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M12 8.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "custom":
    default:
      return (
        <svg className={cn(common, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 7h12M6 12h12M6 17h8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
  }
}
