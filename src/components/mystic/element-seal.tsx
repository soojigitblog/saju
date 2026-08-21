import { cn } from "@/lib/utils";

export type ElementSealItem = {
  key: "wood" | "fire" | "earth" | "metal" | "water";
  hanja: string;
  relation: string;
  level: "약" | "보통" | "강";
  count: number;
};

const COLOR: Record<ElementSealItem["key"], string> = {
  wood: "var(--el-wood)",
  fire: "var(--el-fire)",
  earth: "var(--el-earth)",
  metal: "var(--el-metal)",
  water: "var(--el-water)",
};

export function ElementSealRow({
  items,
  className,
}: {
  items: ElementSealItem[];
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-center gap-3 sm:gap-4",
        className
      )}
    >
      {items.map((el) => {
        const strong = el.count === max && el.count > 0;
        const color = COLOR[el.key];
        return (
          <div key={el.key} className="flex w-[3.6rem] flex-col items-center gap-1.5 sm:w-16">
            <div
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full border sm:h-16 sm:w-16",
                strong ? "shadow-[var(--glow-gold)]" : ""
              )}
              style={{
                borderColor: strong ? "var(--gold-primary)" : `${color}66`,
                background: `radial-gradient(circle at 35% 30%, ${color}33, transparent 65%), var(--bg-card)`,
              }}
            >
              <span
                className="font-[family-name:var(--font-display)] text-xl sm:text-2xl"
                style={{ color: strong ? "var(--gold-light)" : color }}
              >
                {el.hanja}
              </span>
            </div>
            <span className="text-[10px] tracking-wide text-[var(--text-muted)]">
              {el.relation}
            </span>
            <span
              className={cn(
                "text-[11px]",
                strong ? "text-[var(--gold-light)]" : "text-[var(--text-secondary)]"
              )}
            >
              {el.level}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Map day-master element → target element relation label (presentation only). */
export function relationForElement(
  dayElement: ElementSealItem["key"],
  target: ElementSealItem["key"]
): string {
  if (dayElement === target) return "비겁";
  const generates: Record<ElementSealItem["key"], ElementSealItem["key"]> = {
    wood: "fire",
    fire: "earth",
    earth: "metal",
    metal: "water",
    water: "wood",
  };
  const controls: Record<ElementSealItem["key"], ElementSealItem["key"]> = {
    wood: "earth",
    earth: "water",
    water: "fire",
    fire: "metal",
    metal: "wood",
  };
  if (generates[dayElement] === target) return "식상";
  if (controls[dayElement] === target) return "재성";
  if (controls[target] === dayElement) return "관성";
  if (generates[target] === dayElement) return "인성";
  return "기운";
}

export function levelFromCount(count: number, max: number): "약" | "보통" | "강" {
  if (count <= 0) return "약";
  if (count >= max && max >= 2) return "강";
  if (count >= Math.ceil(max * 0.6)) return "보통";
  if (count === 1) return "약";
  return "보통";
}
