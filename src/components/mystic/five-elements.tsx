/** Decorative five-elements motif — visual atmosphere, not calculated data */
const ELEMENTS = [
  { hanja: "木", label: "木", color: "#4a7c59" },
  { hanja: "火", label: "火", color: "#a85c4a" },
  { hanja: "土", label: "土", color: "#b8935a" },
  { hanja: "金", label: "金", color: "#8a9098" },
  { hanja: "水", label: "水", color: "#4a6a8a" },
] as const;

export function FiveElementsDecor({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <p className="hanja-accent mb-4 text-center">五行 · 木火土金水</p>
      <div className="flex items-end justify-center gap-3">
        {ELEMENTS.map((el, i) => (
          <div key={el.hanja} className="flex flex-col items-center gap-2">
            <div
              className="w-7 rounded-sm opacity-80"
              style={{
                height: `${28 + (i % 3) * 12}px`,
                background: `linear-gradient(to top, ${el.color}88, ${el.color}33)`,
                border: `1px solid ${el.color}55`,
              }}
            />
            <span
              className="font-[family-name:var(--font-display)] text-sm"
              style={{ color: el.color }}
            >
              {el.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
