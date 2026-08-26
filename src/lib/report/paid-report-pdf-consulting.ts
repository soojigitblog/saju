/**
 * Consulting-grade PDF HTML — parallel to Easy Value v5.
 * Depth over page count. Live Gemini not used.
 */
import type { InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";
import {
  glossaryCompactHtml,
  glossFirstMentions,
  sanitizeEditorialCopy,
  scopeBlockHtml,
} from "@/lib/report/v5/easy-korean";
import {
  buildConsultingPack,
  type ConsultingDiscovery,
  type ConsultingPack,
} from "@/lib/report/v5/consulting-value-pack";
import { v5BaseCss, v5FontsHead } from "@/lib/report/v5/css";
import { coverTitleForProduct, KNOWN_PARTICLE_ERRORS } from "@/lib/report/v5/tokens";
import { findInternalCustomerTerms } from "@/lib/report/paid-report-pdf-v5";

function esc(s: string | undefined | null) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clean(s: string): string {
  return sanitizeEditorialCopy(String(s ?? "").trim());
}

function footer(page: number, total: number) {
  return `<div class="footer sans"><span>運의結</span><span class="pn">${page} / ${total}</span></div>`;
}

function coverPage(
  kind: "money" | "career" | "love" | "total",
  nickname: string,
  en: string,
  page: number,
  total: number
) {
  const c = coverTitleForProduct(nickname, kind);
  return `<div class="page cover sans" data-shot="cover" data-layout="cover">
  <div class="cover-stage">
    <p class="brand-mark">${c.brandLine}</p>
    <div class="cover-ornament"></div>
    <h1 class="serif">${esc(c.titleLines[0])}<br/>${esc(c.titleLines[1])}</h1>
    <p class="en">${esc(en).replace(/ /g, "&nbsp;")}</p>
  </div>
  ${footer(page, total)}
</div>`;
}

function dashHtml(lines: { label: string; value: string }[], max = 5) {
  return lines
    .slice(0, max)
    .map(
      (d) =>
        `<div class="dash-row"><span class="l">${esc(d.label)}</span><span class="v">${esc(d.value)}</span></div>`
    )
    .join("");
}

function chainHtml(chain: ConsultingDiscovery["chain"]) {
  if (!chain.length) return "";
  return `<div class="chain">${chain
    .map(
      (s) =>
        `<div class="chain-step"><span class="lab">${esc(s.label)}</span><span>${esc(s.text)}</span></div>`
    )
    .join("")}</div>`;
}

function misreadHtml(d: ConsultingDiscovery) {
  if (!d.selfView && !d.outsideView) return "";
  return `<div class="misread">
  <div class="box"><p class="lab">나는</p><p class="val">${esc(d.selfView || "—")}</p></div>
  <div class="box"><p class="lab">상대에게는</p><p class="val">${esc(d.outsideView || "—")}</p></div>
</div>`;
}

function selfMisHtml(d: ConsultingDiscovery) {
  if (!d.selfMisread) return "";
  return `<div class="self-mis"><p class="lab">내가 나를 오해하기 쉬운 점</p><p class="val">${esc(d.selfMisread)}</p></div>`;
}

function evidenceEasyHtml(text: string | undefined, glossSeen: Set<string>, budget: { left: number }) {
  if (!text || budget.left <= 0) return "";
  budget.left -= 1;
  const easy = glossFirstMentions(clean(text), glossSeen);
  return `<div class="ev-block">
  <p class="ev-kicker">사주에서는 왜 이렇게 볼까요?</p>
  <p class="ev-plain">${esc(easy)}</p>
</div>`;
}

function discoveryBlock(
  d: ConsultingDiscovery,
  glossSeen: Set<string>,
  evBudget: { left: number },
  opts?: { showChain?: boolean; showMisread?: boolean; showSelfMis?: boolean; showCounter?: boolean }
) {
  const showChain = opts?.showChain !== false && d.chain.length > 0;
  const showMis = opts?.showMisread !== false && (d.selfView || d.outsideView);
  const showSelf = opts?.showSelfMis !== false && !!d.selfMisread;
  const showCounter = opts?.showCounter !== false && !!d.counter;
  return `<div class="insight" data-insight="${esc(d.id)}" data-level="${d.level}">
  <p class="q">${esc(d.question)}</p>
  <p class="disc-narrative">${esc(glossFirstMentions(d.narrative, glossSeen))}</p>
  ${showChain ? chainHtml(d.chain) : ""}
  ${showMis ? misreadHtml(d) : ""}
  ${showSelf ? selfMisHtml(d) : ""}
  ${showCounter ? `<p class="counter"><span class="lab">반대로</span>${esc(d.counter)}</p>` : ""}
  ${d.shareCandidate ? `<p class="moment">${esc(d.shareCandidate)}</p>` : ""}
  ${evidenceEasyHtml(d.evidenceEasy, glossSeen, evBudget)}
</div>`;
}

function actionHtml(pack: ConsultingPack, limit: number) {
  return pack.actions
    .slice(0, limit)
    .map((a) => {
      const when = clean(a.when ?? "");
      const what = clean(a.what);
      const why = clean(a.why);
      return `<div class="action-card">
  ${when ? `<p class="when"><span class="k">WHEN</span>${esc(when)}</p>` : ""}
  <p class="do"><span class="k">DO</span>${esc(what)}${a.how ? ` — ${esc(clean(a.how))}` : ""}</p>
  <p class="because"><span class="k">BECAUSE</span>${esc(why)}</p>
</div>`;
    })
    .join("");
}

function pickLevel3(pack: ConsultingPack, n: number) {
  const l3 = pack.discoveries.filter((d) => d.level === 3);
  const rest = pack.discoveries.filter((d) => d.level !== 3);
  return [...l3, ...rest].slice(0, n);
}

function buildFocusHtml(input: {
  kind: "money" | "career" | "love";
  nickname: string;
  pack: ConsultingPack;
  en: string;
}): string {
  const { kind, nickname, pack, en } = input;
  const total = 7;
  const glossSeen = new Set<string>();
  const evBudget = { left: kind === "money" ? 2 : 3 };
  const discs = pickLevel3(pack, 6);
  const d0 = discs[0]!;
  const d1 = discs[1]!;
  const d2 = discs[2]!;
  const d3 = discs[3];
  const d4 = discs[4];
  const shares = pack.shareLines.slice(0, 2);

  const pages = [
    coverPage(kind, nickname, en, 1, total),
    `<div class="page paper sans" data-shot="profile" data-layout="profile-dashboard">
  <p class="kicker">나를 한눈에</p>
  <p class="sig serif">${esc(glossFirstMentions(pack.signature, glossSeen))}</p>
  <div class="dash-grid">${dashHtml(pack.profileLines, 5)}</div>
  <div class="rule"></div>
  <p class="section-title serif">기억해 두고 싶은 문장</p>
  ${shares.map((s) => `<p class="moment">${esc(s)}</p>`).join("")}
  ${footer(2, total)}
</div>`,
    `<div class="page tint sans" data-shot="discovery-chain" data-layout="insight">
  <p class="kicker">Core Discovery 01 · 행동의 연쇄</p>
  <h2 class="part-title serif">그래서 이런 순서로 움직입니다</h2>
  ${discoveryBlock(d0, glossSeen, evBudget, { showMisread: false, showSelfMis: false })}
  ${footer(3, total)}
</div>`,
    `<div class="page paper sans" data-shot="discovery-shadow" data-layout="insight">
  <p class="kicker">Core Discovery 02 · 강점 ↔ 그림자</p>
  <h2 class="part-title serif">잘 쓰는 힘이 과해질 때</h2>
  ${discoveryBlock(d1, glossSeen, evBudget, { showChain: false })}
  ${
    pack.strengthShadows[0]
      ? `<div class="shadow-compare" style="margin-top:12px">
  <div class="shadow-head"><span>강점</span><span>과해질 때</span><span>균형</span></div>
  <div class="shadow-row">
    <div class="sc"><p class="lab">강점</p><p class="val">${esc(clean(pack.strengthShadows[0].strength))}</p></div>
    <div class="sc"><p class="lab">과해질 때</p><p class="val">${esc(clean(pack.strengthShadows[0].overuse))}</p></div>
    <div class="sc"><p class="lab">균형</p><p class="val">${esc(clean(pack.strengthShadows[0].balancePoint ?? pack.strengthShadows[0].problem))}</p></div>
  </div>
</div>`
      : ""
  }
  ${footer(4, total)}
</div>`,
    `<div class="page tint sans" data-shot="discovery-others" data-layout="insight">
  <p class="kicker">Core Discovery 03 · 다른 사람이 보는 나</p>
  <h2 class="part-title serif">의도 vs 읽히는 방식</h2>
  ${discoveryBlock(d2, glossSeen, evBudget, { showChain: true })}
  ${footer(5, total)}
</div>`,
    `<div class="page paper sans" data-shot="discovery-misread" data-layout="insight">
  <p class="kicker">Core Discovery 04–05 · 오해 · 예외</p>
  <h2 class="part-title serif">나를 잘못 이해했던 지점</h2>
  ${d3 ? discoveryBlock(d3, glossSeen, evBudget, { showChain: false }) : ""}
  ${d4 ? discoveryBlock(d4, glossSeen, { left: 0 }, { showChain: false, showMisread: true }) : ""}
  ${
    pack.contradictions[0]
      ? `<div class="contra" style="margin-top:10px"><div class="contra-poles serif"><span>${esc(pack.contradictions[0].poleA)}</span><span class="sep">↔</span><span>${esc(pack.contradictions[0].poleB)}</span></div><p class="body">${esc(clean(pack.contradictions[0].howItShows))}</p>${pack.contradictions[0].result ? `<p class="caption">${esc(clean(pack.contradictions[0].result))}</p>` : ""}</div>`
      : ""
  }
  ${footer(6, total)}
</div>`,
    `<div class="page tint sans" data-shot="playbook-final" data-layout="final-portrait">
  <p class="kicker">Personal Playbook</p>
  <h2 class="part-title serif">다음에 쓸 문장</h2>
  ${actionHtml(pack, 5)}
  <div class="rule"></div>
  ${pack.portrait
    .slice(0, 2)
    .map((p) => `<p class="portrait">${esc(p)}</p>`)
    .join("")}
  <p class="closing serif">${esc(pack.closing)}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  ${footer(7, total)}
</div>`,
  ];
  return pages.join("\n");
}

function buildTotalHtml(input: {
  nickname: string;
  pack: ConsultingPack;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const { nickname, pack, ctx } = input;
  const total = 11;
  const glossSeen = new Set<string>();
  const evBudget = { left: 2 };
  const discs = pickLevel3(pack, 8);
  const fe = ctx.fiveElements;
  const maxFe = Math.max(fe.wood, fe.fire, fe.earth, fe.metal, fe.water, 1);

  const pillar = (
    label: string,
    gan: string,
    zhi: string,
    tg: string,
    tb: string,
    unknown = false
  ) =>
    `<div class="pillar"><p class="pl">${label}</p><p class="gan">${unknown ? "—" : esc(gan)}</p><p class="zhi">${unknown ? "—" : esc(zhi)}</p><p class="meta">五行 <br/>十星 ${unknown ? "—" : `${esc(tg)} · ${esc(tb)}`}</p></div>`;

  const pillars = !ctx.pillars.hour
    ? [
        pillar("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillar("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillar("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillar("時柱", "", "", "", "", true),
      ]
    : [
        pillar("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillar("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillar("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillar("時柱", ctx.pillars.hour.stem, ctx.pillars.hour.branch, ctx.tenGods.hour!.stem, ctx.tenGods.hour!.branch),
      ];

  const feBars = [
    { l: "木", n: fe.wood },
    { l: "火", n: fe.fire },
    { l: "土", n: fe.earth },
    { l: "金", n: fe.metal },
    { l: "水", n: fe.water },
  ]
    .map(
      (x) =>
        `<div class="fe-item"><div class="b" style="height:${Math.round((x.n / maxFe) * 48)}px"></div><div class="t">${x.l}</div><div class="n">${x.n}</div></div>`
    )
    .join("");

  const dmHangul =
    ctx.dayMaster.hangul && ctx.dayMaster.hangul !== ctx.dayMaster.stem
      ? ` (${esc(ctx.dayMaster.hangul)})`
      : "";

  const pages = [
    coverPage("total", nickname, "PERSONAL OPERATING MANUAL", 1, total),
    `<div class="page paper sans" data-shot="core-portrait" data-layout="editorial-feature">
  <p class="kicker">Core Portrait</p>
  <p class="sig serif">${esc(glossFirstMentions(pack.signature, glossSeen))}</p>
  <div class="dash-grid">${dashHtml(pack.profileLines, 6)}</div>
  ${pack.shareLines
    .slice(0, 2)
    .map((s) => `<p class="moment">${esc(s)}</p>`)
    .join("")}
  ${footer(2, total)}
</div>`,
    `<div class="page tint sans" data-shot="saju-map" data-layout="saju-map">
  <p class="kicker">나의 사주 지도</p>
  <h2 class="part-title serif">四柱</h2>
  <p class="caption">日干 ${esc(ctx.dayMaster.stem)}${dmHangul}</p>
  <div class="legend"><span>天干 · 위</span><span>地支 · 아래</span><span>五行 / 十星 · 하단</span></div>
  <div class="saju-map"><div class="pillar-row">${pillars.join("")}</div></div>
  <p class="kicker">五行 Snapshot</p>
  <div class="fe-strip">${feBars}</div>
  <p class="caption" style="margin-top:10px">여기서 나온 해석은 아래 ‘나를 움직이는 구조’로 이어집니다. 용어보다 생활 장면이 본문입니다.</p>
  ${footer(3, total)}
</div>`,
    `<div class="page paper sans" data-shot="what-drives" data-layout="insight">
  <p class="kicker">What Drives Me</p>
  <h2 class="part-title serif">나를 움직이는 핵심 구조</h2>
  ${discs[0] ? discoveryBlock(discs[0], glossSeen, evBudget) : ""}
  ${discs[1] ? discoveryBlock(discs[1], glossSeen, { left: 0 }, { showChain: true }) : ""}
  ${footer(4, total)}
</div>`,
    `<div class="page tint sans" data-shot="how-change" data-layout="insight">
  <p class="kicker">How I Change By Situation</p>
  <h2 class="part-title serif">상황에 따라 달라 보이는 이유</h2>
  ${discs[2] ? discoveryBlock(discs[2], glossSeen, { left: 0 }) : ""}
  ${discs[5] ? discoveryBlock(discs[5], glossSeen, { left: 0 }, { showChain: true }) : ""}
  ${footer(5, total)}
</div>`,
    `<div class="page paper sans" data-shot="how-others" data-layout="insight">
  <p class="kicker">How Others See Me</p>
  <h2 class="part-title serif">다른 사람이 나를 오해하기 쉬운 지점</h2>
  ${discs[6] ? discoveryBlock(discs[6], glossSeen, evBudget, { showChain: false }) : ""}
  ${discs.slice(0, 3)
    .filter((d) => d.selfView || d.outsideView)
    .slice(0, 2)
    .map((d) => misreadHtml(d))
    .join("")}
  ${footer(6, total)}
</div>`,
    `<div class="page tint sans" data-shot="cross-domain" data-layout="insight">
  <p class="kicker">Cross-domain Connections</p>
  <h2 class="part-title serif">한 영역의 강점이 다른 영역에서는</h2>
  ${pack.crossDomain
    .slice(0, 4)
    .map(
      (x) =>
        `<div class="xd-row"><p class="pair">${esc(x.from)} → ${esc(x.to)}</p><p class="bridge">${esc(clean(x.bridge))}</p></div>`
    )
    .join("")}
  ${discs[3] ? `<p class="disc-narrative" style="margin-top:12px">${esc(discs[3].narrative)}</p>` : ""}
  ${footer(7, total)}
</div>`,
    `<div class="page paper sans" data-shot="contradictions" data-layout="contradiction">
  <p class="kicker">Contradictions</p>
  <h2 class="part-title serif">A인데 왜 B처럼 보일까</h2>
  ${pack.contradictions
    .slice(0, 4)
    .map(
      (c) =>
        `<div class="contra"><div class="contra-poles serif"><span>${esc(c.poleA)}</span><span class="sep">↔</span><span>${esc(c.poleB)}</span></div><p class="body">${esc(clean(c.howItShows))}</p><p class="caption">빛나는 면 · ${esc(clean(c.upside))}</p><p class="caption">그림자 · ${esc(clean(c.downside))}</p>${c.result ? `<p class="caption">타인이 헷갈리는 지점 · ${esc(clean(c.result))}</p>` : ""}</div>`
    )
    .join("")}
  ${footer(8, total)}
</div>`,
    `<div class="page tint sans" data-shot="pattern-chains" data-layout="insight">
  <p class="kicker">Pattern Chains</p>
  <h2 class="part-title serif">시작 → 반응 → 결과</h2>
  ${pack.patternChains
    .slice(0, 3)
    .map(
      (p) =>
        `<div class="pchain"><p class="t">${esc(p.title)}</p><p class="steps">${esc(p.steps.join(" → "))}</p></div>`
    )
    .join("")}
  ${footer(9, total)}
</div>`,
    `<div class="page paper sans" data-shot="shadow" data-layout="strength-shadow">
  <p class="kicker">Strength → Shadow</p>
  <h2 class="part-title serif">과해지는 구간을 알면 균형이 생깁니다</h2>
  <div class="shadow-compare">
  <div class="shadow-head"><span>강점</span><span>과해질 때</span><span>균형</span></div>
  ${pack.strengthShadows
    .slice(0, 3)
    .map(
      (sh) =>
        `<div class="shadow-row">
  <div class="sc"><p class="lab">강점</p><p class="val">${esc(clean(sh.strength))}</p></div>
  <div class="sc"><p class="lab">과해질 때</p><p class="val">${esc(clean(sh.overuse))}</p></div>
  <div class="sc"><p class="lab">균형</p><p class="val">${esc(clean(sh.balancePoint ?? sh.problem))}</p></div>
</div>`
    )
    .join("")}
  </div>
  ${footer(10, total)}
</div>`,
    `<div class="page tint sans" data-shot="operating-manual" data-layout="final-portrait">
  <p class="kicker">Personal Operating Manual</p>
  <h2 class="part-title serif">나를 잘 쓰는 방법</h2>
  ${actionHtml(pack, 8)}
  <div class="rule"></div>
  ${pack.portrait
    .slice(0, 3)
    .map((p) => `<p class="portrait">${esc(p)}</p>`)
    .join("")}
  <p class="closing serif">${esc(pack.closing)}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  ${footer(11, total)}
</div>`,
  ];
  return pages.join("\n");
}

export function buildPaidReportPdfHtmlConsulting(input: {
  nickname: string;
  productName: string;
  productSlug: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const slug = input.productSlug;
  const kind: "money" | "career" | "love" | "total" = /money/i.test(slug)
    ? "money"
    : /career|job/i.test(slug)
      ? "career"
      : /love/i.test(slug)
        ? "love"
        : "total";

  const pack = buildConsultingPack(kind, input.report);
  const body =
    kind === "total"
      ? buildTotalHtml({ nickname: input.nickname, pack, ctx: input.ctx, v2: input.v2 })
      : buildFocusHtml({
          kind,
          nickname: input.nickname,
          pack,
          en:
            kind === "money"
              ? "MONEY CONSULTING MANUAL"
              : kind === "career"
                ? "WORK CONSULTING MANUAL"
                : "LOVE CONSULTING MANUAL",
        });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(input.productName)} — 運의結</title>
${v5FontsHead()}
<style>${v5BaseCss()}</style>
</head>
<body class="sans">
${body}
</body>
</html>`;
}

export function findConsultingGenericAdvice(text: string): string[] {
  const hits: string[] = [];
  for (const re of [
    /계획적으로\s*하세요/g,
    /대화를\s*많이\s*하세요/g,
    /자신을\s*믿으세요/g,
    /긍정적으로\s*생각하세요/g,
    /균형을\s*찾으세요/g,
    /꼼꼼함을\s*활용하세요/g,
  ]) {
    for (const m of text.matchAll(re)) hits.push(m[0]!);
  }
  return [...new Set(hits)];
}

export function findConsultingParticleErrors(text: string): string[] {
  const hits: string[] = [];
  for (const re of KNOWN_PARTICLE_ERRORS) {
    const m = text.match(re);
    if (m) hits.push(m[0]!);
  }
  return [...new Set(hits)];
}

export { findInternalCustomerTerms };
