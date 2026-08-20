import { cn } from "@/lib/utils";

export function StarRating({
  value,
  max = 5,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5 text-[var(--gold)]", className)}
      aria-label={`${value}점`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className="text-base leading-none">
          {i < value ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}
