import Image from "next/image";
import { BrandMark } from "@/components/mystic/brand-mark";
import { cn } from "@/lib/utils";

const CARD_BACK = "/images/tarot/card-back.svg";

export function TarotCardBack({
  className,
  selected = false,
  order,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  order?: number;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden border bg-[var(--bg-primary)] transition-[transform,box-shadow,border-color] duration-200",
        selected
          ? "border-[var(--gold-primary)] shadow-[var(--glow-gold)]"
          : "border-[var(--border-gold)]/50",
        className
      )}
      {...props}
    >
      <Image src={CARD_BACK} alt="" fill className="object-cover" />
      {selected && order !== undefined ? (
        <span className="absolute inset-x-0 bottom-2 text-center text-xs font-semibold text-[var(--gold-light)]">
          {order}
        </span>
      ) : null}
    </button>
  );
}

export function TarotCardFace({
  nameKo,
  nameEn,
  orientation,
  className,
  compact = false,
}: {
  nameKo: string;
  nameEn?: string;
  orientation?: string;
  className?: string;
  compact?: boolean;
}) {
  const reversed = orientation === "REVERSED";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-[var(--border-gold)] bg-[#f3ebdd] px-2 text-center",
        compact ? "h-28 w-20" : "h-32 w-[5.5rem]",
        reversed ? "rotate-180" : "",
        className
      )}
    >
      <BrandMark size={compact ? 16 : 20} />
      <span className="mt-1.5 font-[family-name:var(--font-display)] text-sm text-[#1a1510]">
        {nameKo}
      </span>
      {nameEn ? (
        <span className="mt-1 text-[9px] tracking-wide text-[#6a6258]">{nameEn}</span>
      ) : null}
    </div>
  );
}

/** Quiet flip reveal — back → face. No sparkle / casino flash. */
export function TarotCardFlip({
  revealed,
  nameKo,
  nameEn,
  orientation,
  className,
}: {
  revealed: boolean;
  nameKo: string;
  nameEn?: string;
  orientation?: string;
  className?: string;
}) {
  return (
    <div className={cn("tarot-flip", revealed && "tarot-flip--revealed", className)}>
      <div className="tarot-flip__inner">
        <div className="tarot-flip__face tarot-flip__face--back">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CARD_BACK} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="tarot-flip__face tarot-flip__face--front">
          <TarotCardFace
            nameKo={nameKo}
            nameEn={nameEn}
            orientation={orientation}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

export function TarotFanPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-28 max-w-xs items-end justify-center",
        className
      )}
      aria-hidden
    >
      {[-18, 0, 18].map((rot, i) => (
        <div
          key={rot}
          className="absolute bottom-0 h-24 w-16 overflow-hidden border border-[var(--border-gold)] bg-[var(--bg-primary)] shadow-[var(--shadow-deep)]"
          style={{
            transform: `translateX(${(i - 1) * 28}px) rotate(${rot}deg)`,
            zIndex: i === 1 ? 2 : 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CARD_BACK} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}
