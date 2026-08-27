/**
 * Consulting PDF — evidence footer from InterpretationContextV2 (no hardcoded chart values).
 */
import type { EvidenceRecord, InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";

function sourceMatches(recordSource: string, key: string): boolean {
  const bare = key.split("=")[0]?.trim() ?? key;
  const rsBare = recordSource.split("=")[0]?.trim() ?? recordSource;
  return recordSource === key || rsBare === bare || recordSource.startsWith(`${bare}=`);
}

export function resolveEvidenceRecords(
  v2: InterpretationContextV2 | undefined,
  sourceKeys: string[]
): EvidenceRecord[] {
  if (!v2 || !sourceKeys.length) return [];
  const out: EvidenceRecord[] = [];
  const seen = new Set<string>();
  for (const key of sourceKeys) {
    const rec = v2.evidenceRegistry.find((e) => e.sources.some((s) => sourceMatches(s, key)));
    if (rec && !seen.has(rec.id)) {
      seen.add(rec.id);
      out.push(rec);
    }
  }
  return out;
}

const RELATION_KO: Record<string, string> = {
  "element-controls-day-master": "일간을 제어하는 관계",
  "day-master-controls": "일간이 제어하는 관계",
  "element-generates-day-master": "일간을 돕는 관계",
  "day-master-generates": "일간을 키우는 관계",
  "same-element": "일간과 같은 기운",
};

/** Customer chip from registry description — specific values, softened counts. */
export function formatEvidenceChip(ev: EvidenceRecord): string {
  let out = ev.description
    .replace(/(\d+)개로\s*가장\s*두드러짐/g, "상대적으로 두드러짐")
    .replace(/(\d+)개로\s*가장\s*적음/g, "상대적으로 적음")
    .replace(/(\d+)회\s*나타남/g, (_, n: string) => {
      const count = Number(n);
      if (count === 2) return "두 차례 나타남";
      if (count === 3) return "세 차례 나타남";
      return `${n}회 나타남`;
    })
    .replace(/^월간\s*십성\s*(.+)$/g, "월간 $1")
    .replace(/^년간\s*십성\s*(.+)$/g, "년간 $1")
    .replace(/\s*\/\s*일지\s*십성\s*/g, " · 일지 ")
    .replace(
      /([木火土金水])과 일간 오행의 관계: ([a-z-]+)/g,
      (_, el: string, rel: string) => `${el} 기운 · ${RELATION_KO[rel] ?? "일간과 연결된 관계"}`
    )
    .trim();
  if (ev.type === "PILLAR_SYMBOL") {
    out = out.replace(/일지\s*([^\s·]+)\s*·\s*일지\s*(.+)/g, "일지 $1 · $2");
  }
  return out;
}

export function buildConsultingEvidenceFooter(
  v2: InterpretationContextV2 | undefined,
  sourceKeys: string[]
): string {
  const records = resolveEvidenceRecords(v2, sourceKeys);
  if (!records.length) return "";
  const chips = records.slice(0, 4).map(formatEvidenceChip).filter(Boolean);
  if (!chips.length) return "";
  return `사주에서 확인한 부분\n${chips.join(" · ")}`;
}

export type EvidenceMappingRow = {
  insightId: string;
  evidenceId: string;
  displayed: string;
  sourceKey: string;
};

/** Validate evidence ID → displayed value → insight mapping for QA. */
export function validateEvidenceMappings(
  discoveries: Array<{ id: string; evidenceSources: string[] }>,
  v2: InterpretationContextV2 | undefined
): { ok: boolean; rows: EvidenceMappingRow[]; genericOnly: string[] } {
  const rows: EvidenceMappingRow[] = [];
  const genericOnly: string[] = [];
  const genericRe = /^(십성\s*분포|오행\s*구성|월간|년간|일주)$/;

  for (const d of discoveries) {
    const records = resolveEvidenceRecords(v2, d.evidenceSources);
    if (!records.length) {
      genericOnly.push(d.id);
      continue;
    }
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]!;
      const displayed = formatEvidenceChip(rec);
      rows.push({
        insightId: d.id,
        evidenceId: rec.id,
        displayed,
        sourceKey: d.evidenceSources[i] ?? rec.sources[0] ?? "",
      });
      if (genericRe.test(displayed)) genericOnly.push(d.id);
    }
  }
  return { ok: genericOnly.length === 0 && rows.length > 0, rows, genericOnly };
}
