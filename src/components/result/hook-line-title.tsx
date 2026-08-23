import { cn } from "@/lib/utils";
import { splitHookLineForDisplay } from "@/lib/text/hook-line-display";

export function HookLineTitle({
  text,
  as: Tag = "h1",
  className,
}: {
  text: string;
  as?: "h1" | "p";
  className?: string;
}) {
  const segments = splitHookLineForDisplay(text);

  return (
    <Tag className={cn("display-title hook-line-title", className)}>
      {segments.map((seg, i) =>
        seg.kind === "break" ? (
          <br key={`br-${i}`} />
        ) : (
          <span key={`t-${i}`}>{seg.value}</span>
        )
      )}
    </Tag>
  );
}
