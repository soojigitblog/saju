/**
 * Consulting-grade PDF HTML — humanized customer copy (no English framework labels).
 * Depth over page count. Live Gemini not used.
 */
import type { InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PaidFortuneReport, PaidActionItem } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";
import {
  consultingEvidenceConclusion,
  glossaryCompactHtml,
  sanitizeEditorialCopy,
  scopeBlockHtml,
  stripLabeledPrefix,
} from "@/lib/report/v5/easy-korean";
import { buildConsultingEvidenceFooter } from "@/lib/report/v5/consulting-evidence";
import {
  buildConsultingPack,
  type ConsultingDiscovery,
  type ConsultingPack,
} from "@/lib/report/v5/consulting-value-pack";
import { v5BaseCss, v5FontsHead } from "@/lib/report/v5/css";
import { coverTitleForProduct, KNOWN_PARTICLE_ERRORS } from "@/lib/report/v5/tokens";
import { findInternalCustomerTerms } from "@/lib/report/paid-report-pdf-v5";
import { resolvePaidReportKindFromProductSlug } from "@/lib/report/paid-report-kind";

const BANNED_FRAMEWORK_LABELS = [
  "Core Discovery",
  "TRIGGER",
  "FIRST",
  "INTERNAL",
  "VISIBLE",
  "OTHERS",
  "RESULT",
  "WHEN",
  "DO",
  "BECAUSE",
  "Personal Playbook",
  "What Drives Me",
  "How I Change By Situation",
  "How Others See Me",
  "Cross-domain Connections",
  "Contradictions",
  "Pattern Chains",
  "Strength → Shadow",
  "Personal Operating Manual",
  "Core Portrait",
  "MONEY CONSULTING MANUAL",
  "WORK CONSULTING MANUAL",
  "LOVE CONSULTING MANUAL",
  "PERSONAL OPERATING MANUAL",
] as const;

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

function bodyCopy(s: string): string {
  return clean(s);
}

const PAGE_FOOTER = "__PAGE_FOOTER__";
const ACTIONS_PER_PLAYBOOK_PAGE = 3;

function stampFooters(pages: string[]): string {
  const total = pages.length;
  return pages.map((p, i) => p.replace(PAGE_FOOTER, footer(i + 1, total))).join("\n");
}

function contentPage(classes: string, shot: string, layout: string, inner: string): string {
  return `<div class="page ${classes} sans" data-shot="${shot}" data-layout="${layout}">
  <div class="page-body safe-bottom">${inner}</div>
  ${PAGE_FOOTER}
</div>`;
}

function chunkActions<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function actionHtmlFromList(actions: PaidActionItem[]) {
  return actions
    .map((a) => {
      const when = clean(a.when ?? "");
      const what = clean(a.what);
      const how = a.how ? clean(a.how) : "";
      const why = clean(a.why);
      return `<div class="action-card">
  ${when ? `<p class="action-lead">이럴 때</p><p class="action-when">${esc(when)}</p>` : ""}
  <p class="action-lead">이렇게 해보세요</p>
  <p class="action-do">${esc(what)}</p>
  ${how ? `<div class="action-example"><p class="ex-lab">작은 예시</p><p class="ex-body">${esc(how)}</p></div>` : ""}
  <p class="action-lead">왜 이게 맞냐면</p>
  <p class="action-why">${esc(why)}</p>
</div>`;
    })
    .join("");
}

function playbookPagesInner(actions: PaidActionItem[], title = "일상에서 바로 써볼 수 있는 방법") {
  const chunks = chunkActions(actions, ACTIONS_PER_PLAYBOOK_PAGE);
  return chunks.map((chunk, idx) => {
    const isCapstone = idx === chunks.length - 1 && chunk.length <= 2 && chunks.length > 1;
    const isContinuation = idx > 0 && !isCapstone;
    const pageClass = isCapstone
      ? "tint page-playbook page-playbook-capstone"
      : "tint page-playbook";
    const actionClass = isCapstone ? "playbook-actions playbook-actions-capstone" : "playbook-actions";
    const head = isCapstone
      ? `<p class="kicker">다음에 쓸 문장</p>
  <h2 class="part-title serif">마지막으로 기억할 두 가지</h2>`
      : idx === 0
        ? `<p class="kicker">다음에 쓸 문장</p>
  <h2 class="part-title serif">${esc(title)}</h2>`
        : `<p class="kicker">다음에 쓸 문장</p>
  <h2 class="part-title serif">${esc(isContinuation ? "장면이 바뀌어도 쓸 문장" : title)}</h2>`;
    return contentPage(
      pageClass,
      idx === 0 ? "playbook" : isCapstone ? "playbook-capstone" : "playbook-continued",
      isCapstone ? "playbook-capstone" : "playbook",
      `${head}
  <div class="${actionClass}">${actionHtmlFromList(chunk)}</div>`
    );
  });
}

function finalPortraitInner(pack: ConsultingPack, glossSeen: Set<string>, portraitLimit = 2) {
  return `<p class="kicker">마무리</p>
  <h2 class="part-title serif">기억해 두면 좋은 문장</h2>
  ${pack.portrait
    .slice(0, portraitLimit)
    .map((p) => `<p class="portrait">${esc(p)}</p>`)
    .join("")}
  <p class="closing serif">${esc(pack.closing)}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}`;
}

function snapshotFields(pack: ConsultingPack, kind: "money" | "career" | "love") {
  const byLabel = (label: string) => pack.profileLines.find((l) => l.label === label);
  const outside = (...ids: string[]) => {
    for (const id of ids) {
      const hit = pack.discoveries.find((d) => d.id === id && d.outsideView);
      if (hit?.outsideView) return hit.outsideView;
    }
    return pack.discoveries.find((d) => d.outsideView)?.outsideView ?? "";
  };

  switch (kind) {
    case "career":
      return {
        strength: byLabel("잘 맞는 구조") ?? pack.profileLines[0]!,
        caution: byLabel("지치는 구조") ?? pack.profileLines[1]!,
        misread: outside("c-boss", "c-conflict", "c-env"),
      };
    case "love": {
      const shadow = pack.strengthShadows[0];
      const caution =
        shadow?.overuse && shadow.strength
          ? { label: shadow.strength, value: shadow.overuse }
          : byLabel("갈등 반응") ?? pack.profileLines[3]!;
      return {
        strength: byLabel("확신 전") ?? byLabel("끌림의 기준") ?? pack.profileLines[0]!,
        caution,
        misread: outside("l-before", "l-expr", "l-fight"),
      };
    }
    default:
      return {
        strength: byLabel("편한 수입 구조") ?? pack.profileLines[2]!,
        caution: byLabel("새는 지점") ?? pack.profileLines[1]!,
        misread: outside("m-people", "m-delay") || byLabel("사람과 돈")?.value || "",
      };
  }
}

function coverPage(kind: "money" | "career" | "love" | "total", nickname: string, tagline: string) {
  const c = coverTitleForProduct(nickname, kind);
  return `<div class="page cover sans" data-shot="cover" data-layout="cover">
  <div class="cover-stage">
    <p class="brand-mark">${c.brandLine}</p>
    <div class="cover-ornament"></div>
    <h1 class="serif">${esc(c.titleLines[0])}<br/>${esc(c.titleLines[1])}</h1>
    ${tagline ? `<p class="cover-tag">${esc(tagline)}</p>` : ""}
  </div>
  ${PAGE_FOOTER}
</div>`;
}

function footer(page: number, total: number) {
  return `<div class="footer sans"><span>運의結</span><span class="pn">${page} / ${total}</span></div>`;
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

/** Flowing chain — no TRIGGER/FIRST labels in customer copy. */
function chainHtml(chain: ConsultingDiscovery["chain"]) {
  if (!chain.length) return "";
  const flow = chain.map((s) => bodyCopy(s.text)).filter(Boolean).join(" → ");
  if (!flow) return "";
  return `<p class="chain-flow">${esc(flow)}</p>`;
}

function misreadHtml(d: ConsultingDiscovery) {
  if (!d.selfView && !d.outsideView) return "";
  return `<div class="misread">
  <div class="box"><p class="lab">내가 느끼는 나</p><p class="val">${esc(d.selfView || "—")}</p></div>
  <div class="box"><p class="lab">상대가 느낄 수 있는 모습</p><p class="val">${esc(d.outsideView || "—")}</p></div>
</div>`;
}

function selfMisHtml(d: ConsultingDiscovery) {
  if (!d.selfMisread) return "";
  return `<div class="self-mis"><p class="lab">스스로를 오해하기 쉬운 점</p><p class="val">${esc(d.selfMisread)}</p></div>`;
}

function evidenceEasyHtml(
  d: ConsultingDiscovery,
  v2: InterpretationContextV2 | undefined,
  budget: { left: number }
) {
  if (!d.evidenceEasy || budget.left <= 0) return "";
  budget.left -= 1;
  const conclusion = consultingEvidenceConclusion(clean(d.evidenceEasy));
  const footerRaw = buildConsultingEvidenceFooter(v2, d.evidenceSources);
  const footerLines = footerRaw.split("\n");
  const footerKicker = footerLines[0] ?? "";
  const footerChips = footerLines.slice(1).join("\n");
  return `<div class="ev-block">
  <p class="ev-kicker">사주에서는 왜 이렇게 볼까요?</p>
  <p class="ev-plain">${esc(conclusion)}</p>
  ${footerKicker && footerChips ? `<p class="ev-footnote-kicker">${esc(footerKicker)}</p><p class="ev-footnote">${esc(footerChips)}</p>` : ""}
</div>`;
}

function discoveryBlock(
  d: ConsultingDiscovery,
  v2: InterpretationContextV2 | undefined,
  evBudget: { left: number },
  opts?: { showChain?: boolean; showMisread?: boolean; showSelfMis?: boolean; showCounter?: boolean }
) {
  const showChain = opts?.showChain !== false && d.chain.length > 0;
  const showMis = opts?.showMisread !== false && (d.selfView || d.outsideView);
  const showSelf = opts?.showSelfMis !== false && !!d.selfMisread;
  const showCounter = opts?.showCounter !== false && !!d.counter;
  const counterText = showCounter ? stripLabeledPrefix(bodyCopy(d.counter)) : "";
  return `<div class="insight" data-insight="${esc(d.id)}" data-level="${d.level}">
  <p class="q">${esc(d.question)}</p>
  <p class="disc-narrative">${esc(bodyCopy(d.narrative))}</p>
  ${showChain ? chainHtml(d.chain) : ""}
  ${showMis ? misreadHtml(d) : ""}
  ${showSelf ? selfMisHtml(d) : ""}
  ${counterText ? `<p class="counter"><span class="lab">반대로</span>${esc(counterText)}</p>` : ""}
  ${d.shareCandidate ? `<p class="moment">${esc(d.shareCandidate)}</p>` : ""}
  ${evidenceEasyHtml(d, v2, evBudget)}
</div>`;
}

function actionHtml(pack: ConsultingPack, limit: number) {
  return actionHtmlFromList(pack.actions.slice(0, limit));
}

function focusSnapshotHtml(pack: ConsultingPack, kind: "money" | "career" | "love") {
  const lines = pack.profileLines;
  const shares = pack.shareLines.slice(0, 3);
  const fields = snapshotFields(pack, kind);
  const traitCards = lines
    .slice(0, 4)
    .map(
      (l) =>
        `<div class="snap-card"><p class="snap-lab">${esc(l.label)}</p><p class="snap-val">${esc(l.value)}</p></div>`
    )
    .join("");
  return `<div class="premium-snapshot">
  <div class="snap-hero"><p class="snap-kicker">한눈에 보는 나</p><p class="snap-sig serif">${esc(bodyCopy(pack.signature))}</p></div>
  <p class="snap-section-lab">핵심 특징</p>
  <div class="snap-grid">${traitCards}</div>
  <div class="snap-connector"><span class="snap-line"></span><span class="snap-arrow">↓</span></div>
  <div class="snap-duo">
    <div class="snap-panel good"><p class="snap-panel-lab">강점이 살아나는 조건</p><p class="snap-panel-title">${esc(fields.strength.label)}</p><p class="snap-panel-val">${esc(fields.strength.value)}</p></div>
    <div class="snap-panel warn"><p class="snap-panel-lab">주의할 조건</p><p class="snap-panel-title">${esc(fields.caution.label)}</p><p class="snap-panel-val">${esc(fields.caution.value)}</p></div>
  </div>
  ${fields.misread ? `<div class="snap-misread"><p class="snap-section-lab">오해받기 쉬운 모습</p><p class="snap-misread-val">${esc(fields.misread)}</p></div>` : ""}
  ${shares.length ? `<div class="snap-highlights"><p class="snap-section-lab">이번 리포트에서 꼭 볼 ${shares.length}가지</p>${shares.map((s, i) => `<div class="snap-highlight"><span class="snap-num">${i + 1}</span><p>${esc(s)}</p></div>`).join("")}</div>` : ""}
</div>`;
}

function signatureVerticalHtml(pack: ConsultingPack) {
  return `<div class="sig-vertical-stage sig-vertical-stack">${pack.strengthShadows
    .slice(0, 3)
    .map(
      (sh) =>
        `<div class="sig-flow-col">
  <div class="sig-node sig-strength"><p class="sig-node-lab">강점</p><p class="sig-node-val">${esc(clean(sh.strength))}</p></div>
  <div class="sig-flow-arrow">↓</div>
  <div class="sig-node sig-over"><p class="sig-node-lab">과해질 때</p><p class="sig-node-val">${esc(clean(sh.overuse))}</p></div>
  <div class="sig-flow-arrow">↓</div>
  <div class="sig-node sig-balance"><p class="sig-node-lab">균형</p><p class="sig-node-val">${esc(clean(sh.balancePoint ?? sh.problem))}</p></div>
</div>`
    )
    .join("")}</div>`;
}

function othersOnlyHtml(discs: (ConsultingDiscovery | undefined)[]) {
  return discs
    .filter(Boolean)
    .map((d) => {
      const disc = d!;
      if (!disc.selfView && !disc.outsideView && !disc.selfMisread) return "";
      return `<div class="others-block">
  <p class="q">${esc(disc.question)}</p>
  ${misreadHtml(disc)}
  ${selfMisHtml(disc)}
</div>`;
    })
    .filter(Boolean)
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
  tagline: string;
  v2?: InterpretationContextV2;
}): string {
  const { kind, nickname, pack, tagline, v2 } = input;
  const evBudget = { left: kind === "money" ? 2 : 3 };
  const discs = pickLevel3(pack, 6);
  const d0 = discs[0]!;
  const d1 = discs[1]!;
  const d2 = discs[2]!;
  const d3 = discs[3];
  const d4 = discs[4];
  const glossSeen = new Set<string>();

  const pages: string[] = [
    coverPage(kind, nickname, tagline),
    contentPage(
      "paper premium-snapshot-page",
      "profile",
      "profile-dashboard",
      `<p class="kicker">나를 한눈에</p>
  ${focusSnapshotHtml(pack, kind)}`
    ),
    contentPage(
      "tint",
      "discovery-chain",
      "insight",
      `<p class="kicker">핵심 발견</p>
  <h2 class="part-title serif">그래서 이런 순서로 움직입니다</h2>
  ${discoveryBlock(d0, v2, evBudget, { showMisread: false, showSelfMis: false })}`
    ),
    contentPage(
      "paper",
      "discovery-shadow",
      "insight",
      `<p class="kicker">강점과 그림자</p>
  <h2 class="part-title serif">잘 쓰는 힘이 과해질 때</h2>
  ${discoveryBlock(d1, v2, evBudget, { showChain: false })}
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
  }`
    ),
    contentPage(
      "tint",
      "discovery-others",
      "insight",
      `<p class="kicker">다른 사람이 보는 나</p>
  <h2 class="part-title serif">의도와 읽히는 방식</h2>
  ${discoveryBlock(d2, v2, evBudget, { showChain: true, showSelfMis: false })}`
    ),
    contentPage(
      "paper",
      "discovery-misread",
      "insight",
      `<p class="kicker">오해와 예외</p>
  <h2 class="part-title serif">나를 잘못 이해했던 지점</h2>
  ${d3 ? discoveryBlock(d3, v2, evBudget, { showChain: false }) : ""}
  ${d4 ? discoveryBlock(d4, v2, { left: 0 }, { showChain: false, showMisread: true, showCounter: false }) : ""}
  ${
    pack.contradictions[0]
      ? `<div class="contra" style="margin-top:10px"><div class="contra-poles serif"><span>${esc(pack.contradictions[0].poleA)}</span><span class="sep">↔</span><span>${esc(pack.contradictions[0].poleB)}</span></div><p class="body">${esc(clean(pack.contradictions[0].howItShows))}</p>${pack.contradictions[0].result ? `<p class="caption">${esc(clean(pack.contradictions[0].result))}</p>` : ""}</div>`
      : ""
  }`
    ),
    ...playbookPagesInner(pack.actions.slice(0, 5)),
    contentPage("tint page-final", "playbook-final", "final-portrait", finalPortraitInner(pack, glossSeen, 2)),
  ];
  return stampFooters(pages);
}

function buildTotalHtml(input: {
  nickname: string;
  pack: ConsultingPack;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const { nickname, pack, ctx, v2 } = input;
  const evBudget = { left: 2 };
  const discs = pickLevel3(pack, 8);
  const fe = ctx.fiveElements;
  const maxFe = Math.max(fe.wood, fe.fire, fe.earth, fe.metal, fe.water, 1);
  const glossSeen = new Set<string>();

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

  const pages: string[] = [
    coverPage("total", nickname, "나라는 사람, 이렇게 움직입니다"),
    `<div class="page paper sans" data-shot="core-portrait" data-layout="editorial-feature">
  <div class="page-body safe-bottom"><p class="kicker">한 줄로 보는 나</p>
  <p class="sig serif">${esc(bodyCopy(pack.signature))}</p>
  <div class="dash-grid">${dashHtml(pack.profileLines, 6)}</div>
  ${pack.shareLines
    .slice(0, 2)
    .map((s) => `<p class="moment">${esc(s)}</p>`)
    .join("")}</div>
  ${PAGE_FOOTER}
</div>`,
    contentPage(
      "tint",
      "saju-map",
      "saju-map",
      `<p class="kicker">나의 사주 지도</p>
  <h2 class="part-title serif">四柱</h2>
  <p class="caption">日干 ${esc(ctx.dayMaster.stem)}${dmHangul}</p>
  <div class="legend"><span>天干 · 위</span><span>地支 · 아래</span><span>五行 / 十星 · 하단</span></div>
  <div class="saju-map"><div class="pillar-row">${pillars.join("")}</div></div>
  <p class="kicker">五行 Snapshot</p>
  <div class="fe-strip">${feBars}</div>
  <p class="caption" style="margin-top:10px">아래 본문은 이 지도를 바탕으로, 일·돈·관계에서 반복되는 장면을 풀어 씁니다.</p>`
    ),
    contentPage(
      "paper",
      "what-drives",
      "insight",
      `<p class="kicker">왜 이렇게 움직일까</p>
  <h2 class="part-title serif">행동이 생기는 이유</h2>
  ${discs[0] ? discoveryBlock(discs[0], v2, evBudget, { showMisread: false, showSelfMis: true }) : ""}`
    ),
    contentPage(
      "tint",
      "how-change",
      "insight",
      `<p class="kicker">상황이 바뀌면</p>
  <h2 class="part-title serif">같은 나도 장면에 따라 달라 보이는 이유</h2>
  ${discs[2] ? discoveryBlock(discs[2], v2, { left: 0 }, { showMisread: false, showSelfMis: true }) : ""}`
    ),
    contentPage(
      "paper",
      "how-others",
      "insight",
      `<p class="kicker">타인의 시선</p>
  <h2 class="part-title serif">상대가 나를 다르게 읽는 지점</h2>
  ${othersOnlyHtml([discs[0], discs[1], discs[4]])}`
    ),
    contentPage(
      "tint",
      "cross-domain",
      "insight",
      `<p class="kicker">영역이 겹칠 때</p>
  <h2 class="part-title serif">한쪽에서 통하는 방식이 다른 쪽에서는</h2>
  ${pack.crossDomain
    .slice(0, 4)
    .map(
      (x) =>
        `<div class="xd-row"><p class="pair">${esc(x.from)} → ${esc(x.to)}</p><p class="bridge">${esc(clean(x.bridge))}</p></div>`
    )
    .join("")}`
    ),
    contentPage(
      "paper",
      "contradictions",
      "contradiction",
      `<p class="kicker">겉과 속</p>
  <h2 class="part-title serif">서로 충돌하는 두 힘</h2>
  ${pack.contradictions
    .slice(0, 4)
    .map(
      (c) =>
        `<div class="contra"><div class="contra-poles serif"><span>${esc(c.poleA)}</span><span class="sep">↔</span><span>${esc(c.poleB)}</span></div><p class="body">${esc(clean(c.howItShows))}</p><p class="caption">빛나는 면 · ${esc(clean(c.upside))}</p><p class="caption">그림자 · ${esc(clean(c.downside))}</p>${c.result ? `<p class="caption">헷갈리는 지점 · ${esc(clean(c.result))}</p>` : ""}</div>`
    )
    .join("")}`
    ),
    contentPage(
      "tint",
      "pattern-chains",
      "insight",
      `<p class="kicker">반복 패턴</p>
  <h2 class="part-title serif">한눈에 기억할 순서</h2>
  ${pack.patternChains
    .slice(0, 3)
    .map(
      (p) =>
        `<div class="pchain"><p class="t">${esc(p.title)}</p><p class="steps">${esc(p.steps.join(" → "))}</p></div>`
    )
    .join("")}`
    ),
    contentPage(
      "paper signature-visual",
      "shadow",
      "strength-shadow",
      `<p class="kicker">강점과 그림자</p>
  <h2 class="part-title serif">과해지는 구간을 알면 균형이 생깁니다</h2>
  ${signatureVerticalHtml(pack)}`
    ),
    ...playbookPagesInner(pack.actions.slice(0, 8), "다음 선택에서 쓸 문장"),
    contentPage("tint page-final", "operating-manual", "final-portrait", finalPortraitInner(pack, glossSeen, 3)),
  ];
  return stampFooters(pages);
}

export function buildPaidReportPdfHtmlConsulting(input: {
  nickname: string;
  productName: string;
  productSlug: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
  /** Live Gemini: skip mock consulting enrich overlay. */
  live?: boolean;
}): string {
  const kind = resolvePaidReportKindFromProductSlug(input.productSlug);

  const pack = buildConsultingPack(kind, input.report, { live: input.live });
  const body =
    kind === "total"
      ? buildTotalHtml({ nickname: input.nickname, pack, ctx: input.ctx, v2: input.v2 })
      : buildFocusHtml({
          kind,
          nickname: input.nickname,
          pack,
          v2: input.v2,
          tagline:
            kind === "money"
              ? "돈, 이렇게 움직입니다"
              : kind === "career"
                ? "일, 이렇게 굴러갑니다"
                : "연애, 이렇게 열립니다",
        });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(input.productName)} — 運의結</title>
${v5FontsHead()}
<style>${v5BaseCss()}
.chain-flow{font-size:13px;line-height:1.65;color:var(--ink-soft);margin:10px 0 0;padding:10px 12px;background:rgba(0,0,0,.03);border-radius:6px}
.action-lead{font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--ink-muted);margin:0 0 2px}
.action-when,.action-do,.action-why{margin:0 0 10px;font-size:13px;line-height:1.6}
.action-do{font-weight:500}
.action-example{margin:4px 0 10px;padding:8px 10px;background:rgba(0,0,0,.04);border-left:2px solid var(--ink-muted);border-radius:4px}
.action-example .ex-lab{font-size:10px;font-weight:600;color:var(--ink-muted);margin:0 0 3px;letter-spacing:.04em}
.action-example .ex-body{margin:0;font-size:11px;line-height:1.55;color:var(--ink-soft)}
.ev-footnote{font-size:10px;color:var(--ink-muted);margin:2px 0 0;line-height:1.5}
.ev-footnote-kicker{font-size:10px;font-weight:600;color:var(--ink-muted);margin:6px 0 2px}
.cover-tag{font-size:13px;color:var(--ink-soft);margin-top:8px}
.others-block{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(0,0,0,.06)}
.others-block:last-child{border-bottom:none}
.premium-snapshot-page .premium-snapshot{display:flex;flex-direction:column;gap:10px;height:calc(100% - 28px)}
.snap-hero{padding:14px 16px;background:linear-gradient(135deg,rgba(0,0,0,.04),rgba(0,0,0,.02));border-radius:8px;border:1px solid rgba(0,0,0,.06)}
.snap-kicker{font-size:10px;letter-spacing:.08em;color:var(--ink-muted);margin:0 0 6px}
.snap-sig{margin:0;font-size:17px;line-height:1.55}
.snap-section-lab{font-size:11px;font-weight:600;color:var(--ink-muted);margin:4px 0 6px;letter-spacing:.04em}
.snap-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.snap-card{padding:8px 10px;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:6px}
.snap-lab{font-size:10px;color:var(--ink-muted);margin:0 0 3px}
.snap-val{font-size:12px;line-height:1.45;margin:0;font-weight:500}
.snap-connector{display:flex;flex-direction:column;align-items:center;gap:2px;margin:2px 0}
.snap-line{width:1px;height:10px;background:rgba(0,0,0,.12)}
.snap-arrow{font-size:12px;color:var(--ink-muted);line-height:1}
.snap-duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.snap-panel{padding:10px 12px;border-radius:6px;border:1px solid rgba(0,0,0,.07)}
.snap-panel.good{background:rgba(46,125,50,.06)}
.snap-panel.warn{background:rgba(198,40,40,.05)}
.snap-panel-lab{font-size:10px;font-weight:600;margin:0 0 4px;color:var(--ink-muted)}
.snap-panel-title{font-size:11px;font-weight:600;margin:0 0 3px}
.snap-panel-val{font-size:12px;line-height:1.45;margin:0}
.snap-misread-val{font-size:12px;line-height:1.5;margin:0}
.snap-misread-val .muted{color:var(--ink-muted)}
.snap-highlights{margin-top:2px}
.snap-highlight{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
.snap-num{flex:0 0 18px;height:18px;border-radius:50%;background:var(--ink);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:600}
.snap-highlight p{margin:0;font-size:12px;line-height:1.45}
.signature-visual .sig-vertical-stage{display:flex;flex-direction:column;gap:14px;margin-top:10px;flex:1}
.signature-visual .page-body.safe-bottom{display:flex;flex-direction:column}
.sig-flow-col{display:flex;flex-direction:column;align-items:stretch;gap:0;flex:1;min-height:0}
.page-playbook-capstone .page-body.safe-bottom{display:flex;flex-direction:column}
.page-playbook-capstone .part-title{margin-bottom:14px}
.page-playbook-capstone .playbook-actions-capstone{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch}
.page-playbook-capstone .action-card{padding:16px 18px;border:1px solid rgba(0,0,0,.09);border-radius:10px;background:rgba(255,255,255,.72);border-bottom:none;display:flex;flex-direction:column;gap:4px;min-height:0}
.page-playbook-capstone .action-lead{margin-top:6px}
.page-playbook-capstone .action-lead:first-child{margin-top:0}
.page-playbook-capstone .action-do{font-size:13.5px;line-height:1.62;margin-bottom:8px}
.page-playbook-capstone .action-example{flex:1;margin:6px 0 10px;padding:10px 12px;background:rgba(0,0,0,.035)}
.page-playbook-capstone .action-why{margin-bottom:0}
.page-playbook .playbook-actions{display:flex;flex-direction:column;gap:8px}
.page-playbook .action-card{padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,.06)}
.page-playbook .action-card:last-child{border-bottom:none;padding-bottom:0}
.page[data-layout="playbook-capstone"] .footer{margin-top:auto}
.signature-visual .sig-node{padding:14px 16px;border-radius:8px;border:1px solid rgba(0,0,0,.08);text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center}
.signature-visual .sig-node-val{font-size:13.5px;line-height:1.55}
.signature-visual .sig-flow-arrow{padding:6px 0}
.page-body.safe-bottom{padding-bottom:20mm;box-sizing:border-box}
.sig-strength{background:rgba(46,125,50,.08)}
.sig-over{background:rgba(198,40,40,.06)}
.sig-balance{background:rgba(25,118,210,.06)}
.sig-node-lab{font-size:10px;font-weight:600;color:var(--ink-muted);margin:0 0 6px;letter-spacing:.04em}
.sig-node-val{font-size:13px;line-height:1.5;margin:0;font-weight:500}
.sig-flow-arrow{text-align:center;font-size:16px;color:var(--ink-muted);line-height:1}
.page-final .portrait{margin:4px 0}
.page-final .glossary,.page-final .scope-block{margin-top:8px}
</style>
</head>
<body class="sans">
${body}
</body>
</html>`;
}

export { snapshotFields };

export const CONSULTING_ACTION_INTEGRITY = [
  "지금은 정리 중",
  "바로 추궁",
  "반복되는 지출",
  "관심 없음을 부정",
] as const;

export const CONSULTING_GARBLED_PATTERNS = [
  /지\s+정리/,
  /바\s+추\s+하/,
  /다\s+반\s+되/,
  /정하\s+상태/,
] as const;

export function findConsultingGarbledText(text: string): string[] {
  const hits: string[] = [];
  for (const re of CONSULTING_GARBLED_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0]!);
  }
  return [...new Set(hits)];
}

export function findMissingActionIntegrity(text: string): string[] {
  return CONSULTING_ACTION_INTEGRITY.filter((phrase) => !text.includes(phrase));
}

export function findConsultingFrameworkLabels(text: string): string[] {
  const body = text.replace(/<!DOCTYPE[^>]*>/gi, "");
  const shortAscii = new Set(["DO", "WHEN", "RESULT", "FIRST", "OTHERS"]);
  return BANNED_FRAMEWORK_LABELS.filter((label) => {
    if (shortAscii.has(label)) {
      return new RegExp(`\\b${label}\\b`).test(body);
    }
    return body.includes(label);
  });
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

export function findConsultingGenericCoaching(text: string): string[] {
  const hits: string[] = [];
  for (const re of [
    /(?:^|[\s>])(?:25분|15분)\s*타이머/g,
    /(?:^|[\s>])(?:3|5)개(?:만|를)?\s*(?:적|표시|기록)/g,
    /(?:^|[\s>])(?:3|5)줄(?:만|을)?/g,
    /기준\s*3개(?:만)?\s*적/g,
  ]) {
    for (const m of text.matchAll(re)) hits.push(m[0]!.trim());
  }
  return [...new Set(hits)];
}

export function findConsultingHardKoreanErrors(text: string): string[] {
  const patterns = [
    "반대로 반대로",
    "반대로 다만",
    "일주과",
    "분포을",
    "일간과 일주이",
    "빨라지는가입니다",
    "tonight",
    "스트레스 엔진",
    "크로스 도메인",
    "오행 구성의 관계이",
    "힘이 셈",
    "같은 엔진",
    "리포트의 핵심은",
    "이 재물 리포트의 핵심",
    "일 리포트의 핵심",
    "연애 리포트의 핵심",
  ];
  return patterns.filter((p) => text.includes(p));
}

export { findInternalCustomerTerms };
