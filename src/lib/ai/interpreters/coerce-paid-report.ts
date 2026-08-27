/**
 * Light coercion for Live Gemini quirks before Zod parse.
 * Does not invent consulting content — only type/shape fixes.
 */
const FE_LABEL: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

function asIntLevel(v: unknown): 1 | 2 | 3 | undefined {
  if (v === 1 || v === 2 || v === 3) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (n === 1 || n === 2 || n === 3) return n;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.round(v);
    if (n === 1 || n === 2 || n === 3) return n as 1 | 2 | 3;
  }
  return undefined;
}

function coerceSection(section: Record<string, unknown>): Record<string, unknown> {
  const next = { ...section };
  if ("discoveryLevel" in next) {
    const level = asIntLevel(next.discoveryLevel);
    if (level === undefined) delete next.discoveryLevel;
    else next.discoveryLevel = level;
  }
  return next;
}

export function coercePaidReportRaw(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const root = { ...(data as Record<string, unknown>) };

  if (Array.isArray(root.fiveElementsSnapshot)) {
    root.fiveElementsSnapshot = root.fiveElementsSnapshot.map((row) => {
      if (!row || typeof row !== "object") return row;
      const r = { ...(row as Record<string, unknown>) };
      const key = String(r.key ?? "");
      const mapped = FE_LABEL[key];
      if (mapped) r.label = mapped;
      else if (typeof r.label === "string" && r.label.length > 8) {
        r.label = r.label.slice(0, 8);
      }
      if (typeof r.count === "string" && Number.isFinite(Number(r.count))) {
        r.count = Math.round(Number(r.count));
      }
      return r;
    });
  }

  if (Array.isArray(root.sections)) {
    root.sections = root.sections.map((s) =>
      s && typeof s === "object" ? coerceSection(s as Record<string, unknown>) : s
    );
  }

  return root;
}
