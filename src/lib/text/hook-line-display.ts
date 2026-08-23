const NBSP = "\u00A0";

/** Collapse whitespace — hook lines are single-line from AI. */
export function normalizeHookLine(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Prevent awkward breaks like "내" / "선 건드리면".
 * Binds short possessive + following word with NBSP.
 */
export function bindHookLinePhrases(line: string): string {
  return line
    .replace(/(내|네|저|그|이) ([가-힣]{1,2})(?= )/g, `$1${NBSP}$2`)
    .replace(/(말이) (짧)/g, `$1${NBSP}$2`);
}

export type HookLineSegment =
  | { kind: "text"; value: string }
  | { kind: "break" };

/**
 * Split hook for display. Prefer line break after comma (two-beat rhythm).
 */
export function splitHookLineForDisplay(raw: string): HookLineSegment[] {
  const text = bindHookLinePhrases(normalizeHookLine(raw));
  const comma = text.indexOf(",");
  if (comma >= 0 && comma < text.length - 1) {
    const rest = text.slice(comma + 1).trimStart();
    if (rest.length > 0) {
      return [
        { kind: "text", value: text.slice(0, comma + 1) },
        { kind: "break" },
        { kind: "text", value: rest },
      ];
    }
  }
  return [{ kind: "text", value: text }];
}
