/**
 * PHASE P1.3 — Editorial PDF HTML (Noto Serif KR + Pretendard).
 */
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function levelLabel(level: "low" | "mid" | "high") {
  if (level === "low") return "낮음";
  if (level === "high") return "높음";
  return "중간";
}

function scaleBar(level: "low" | "mid" | "high") {
  const pct = level === "low" ? 25 : level === "high" ? 82 : 52;
  return `<div class="scale-track"><div class="scale-fill" style="width:${pct}%"></div></div>`;
}

export function buildPaidReportPdfHtmlV3(input: {
  nickname: string;
  productName: string;
  orderNo: string;
  report: PaidFortuneReport;
}): string {
  const r = input.report;
  const isMoney = r.reportKind === "money";
  const coverEn = isMoney ? "MONEY READING" : "PERSONAL FOUR PILLARS REPORT";
  const coverKo = isMoney ? "재물 사용설명서" : "사주 사용설명서";

  const profileRows = (r.profileDashboard ?? [])
    .map(
      (p) =>
        `<div class="dash-row"><span class="dash-label">${esc(p.label)}</span><span class="dash-value">${esc(p.value)}</span></div>`
    )
    .join("");

  const scales = (r.profileScales ?? [])
    .map(
      (s) => `<div class="scale-card">
        <div class="scale-head"><span>${esc(s.label)}</span><span class="scale-level">${levelLabel(s.level)}</span></div>
        ${scaleBar(s.level)}
        <div class="scale-ends"><span>${esc(s.leftLabel)}</span><span>${esc(s.rightLabel)}</span></div>
        <p class="scale-note">${esc(s.note)}</p>
      </div>`
    )
    .join("");

  const chapters = r.sections
    .map((s, i) => {
      const n = String(i + 1).padStart(2, "0");
      const scenes = (s.behaviorScenes ?? [])
        .map((sc) => `<li class="scene-card">${esc(sc)}</li>`)
        .join("");
      const why =
        s.includeWhyBox && (s.evidenceExplanation?.length ?? 0) > 0
          ? `<aside class="insight-box"><p class="insight-label">왜 이렇게 읽히는가</p>${(s.evidenceExplanation ?? [])
              .map((w) => `<p>${esc(w)}</p>`)
              .join("")}<p class="evidence-line">근거 · ${esc(formatFortuneEvidenceForDisplay(s.evidence).join(" · "))}</p></aside>`
          : `<p class="evidence-line">근거 · ${esc(formatFortuneEvidenceForDisplay(s.evidence).join(" · "))}</p>`;
      const bridge = s.narrativeBridge
        ? `<p class="bridge">${esc(s.narrativeBridge)}</p>`
        : "";
      const paradox = s.paradoxNote
        ? `<p class="paradox">${esc(s.paradoxNote)}</p>`
        : "";
      const sides =
        s.strengthSide || s.riskSide
          ? `<div class="split-cols">${s.strengthSide ? `<div><b>강점</b><p>${esc(s.strengthSide)}</p></div>` : ""}${s.riskSide ? `<div><b>주의</b><p>${esc(s.riskSide)}</p></div>` : ""}</div>`
          : "";
      const shot =
        i === Math.floor(r.sections.length / 2) ? ' data-shot="middle"' : "";
      return `<article class="chapter page-block"${shot}>
        <p class="chapter-no">${n}</p>
        <h2>${esc(s.title)}</h2>
        ${s.question ? `<p class="question">Q. ${esc(s.question)}</p>` : ""}
        ${bridge}
        ${s.pullQuote ? `<blockquote>${esc(s.pullQuote)}</blockquote>` : ""}
        <p class="lead">${esc(s.coreInsight)}</p>
        ${paradox}
        <ul class="scene-list">${scenes}</ul>
        ${sides}
        ${why}
        ${s.takeaway ? `<p class="takeaway">→ ${esc(s.takeaway)}</p>` : ""}
      </article>`;
    })
    .join("\n");

  const contradictions = (r.contradictions ?? [])
    .map(
      (c) => `<article class="contra-card">
      <div class="contra-poles"><span>${esc(c.poleA)}</span><span class="contra-x">×</span><span>${esc(c.poleB)}</span></div>
      <p>${esc(c.howItShows)}</p>
      ${c.result ? `<p class="contra-result"><b>RESULT</b> ${esc(c.result)}</p>` : ""}
      <div class="tri-grid"><div><b>장점</b><p>${esc(c.upside)}</p></div><div><b>문제</b><p>${esc(c.downside)}</p></div><div><b>언제</b><p>${esc(c.whenStronger)}</p></div></div>
    </article>`
    )
    .join("");

  const shadows = (r.strengthShadows ?? [])
    .map(
      (s) =>
        `<div class="shadow-ladder"><p class="shadow-top">${esc(s.strength)}</p><p class="shadow-arrow">↓ 과해질 때</p><p>${esc(s.overuse)}</p><p class="shadow-arrow">→ 현실 결과</p><p>${esc(s.problem)}</p>${s.balancePoint ? `<p class="shadow-balance"><b>균형점</b> ${esc(s.balancePoint)}</p>` : ""}</div>`
    )
    .join("");

  const lifeSpread = (r.lifeScenes ?? [])
    .map((s, i) => `<li class="life-chip"><span class="life-no">${i + 1}</span>${esc(s)}</li>`)
    .join("");

  const actions = r.actionItems
    .map(
      (a) =>
        `<li class="action-row">${a.when ? `<p class="action-when">WHEN · ${esc(a.when)}</p>` : ""}<p class="action-do"><b>DO</b> ${esc(a.what)}</p><p class="action-why"><b>WHY</b> ${esc(a.why)}</p><p class="action-how"><b>HOW</b> ${esc(a.how)}</p></li>`
    )
    .join("");

  const fs_ = r.finalSummary;
  const list = (xs: string[]) => xs.map((x) => `<li>${esc(x)}</li>`).join("");

  const blueprint = r.blueprint
    ? `<section class="blueprint page-block"><p class="kicker">사주 설계도</p><p class="serif gold">${esc(r.blueprint.dayMasterTerm)}</p><p>${esc(r.blueprint.dayMasterPlain)}</p><p class="muted">${esc(r.blueprint.fiveElementsNote)} · ${esc(r.blueprint.tenGodsNote)}</p><p>${esc(r.blueprint.structurePlain)}</p><p>${esc(r.blueprint.lifePlain)}</p></section>`
    : "";

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<title>${esc(input.productName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet"/>
<style>
@page{size:A4;margin:12mm 11mm}
*{box-sizing:border-box}
body{margin:0;font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#121820;background:#f6f0e4;font-size:10.75pt;line-height:1.68}
.serif{font-family:"Noto Serif KR",serif}
.page-block{break-inside:avoid-page}
.cover{page-break-after:always;min-height:277mm;background:linear-gradient(165deg,#06101c 0%,#0c1a2e 55%,#152238 100%);color:#f4ecde;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:48px 36px}
.cover .brand{font-family:"Noto Serif KR",serif;font-size:15px;color:#c9a227;margin:0}
.cover h1{font-family:"Noto Serif KR",serif;font-size:34px;font-weight:700;line-height:1.32;margin:28px 0 12px}
.cover .sub{font-size:16px;color:#d8ccb8;margin:0}
.cover .en{font-size:10px;letter-spacing:.08em;color:#9a9078;margin-top:36px}
.cover .meta{font-size:9px;color:#7a7268;margin-top:48px}
.profile-page{page-break-after:always;background:#fffdf9;border:1px solid #e2d8c8;padding:22px 20px;margin-bottom:16px}
.kicker{font-size:9px;color:#8a7020;text-transform:uppercase;margin:0 0 8px}
.profile-page h2{font-family:"Noto Serif KR",serif;font-size:22px;margin:0 0 14px;line-height:1.35;color:#06101c}
.dash-row{display:grid;grid-template-columns:8.2rem 1fr;gap:8px;border-bottom:1px solid #ece4d6;padding:7px 0;font-size:10.5pt}
.dash-label{color:#6b6458}
.dash-value{color:#1a2430}
.scales{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.scale-card{border:1px solid #e6ddcf;background:#fff;padding:10px;border-radius:2px}
.scale-head{display:flex;justify-content:space-between;font-size:10pt;font-weight:600;margin-bottom:6px}
.scale-level{color:#8a7020;font-size:9pt}
.scale-track{height:6px;background:#ece4d6;border-radius:3px;overflow:hidden}
.scale-fill{height:100%;background:linear-gradient(90deg,#8a7020,#c9a227)}
.scale-ends{display:flex;justify-content:space-between;font-size:8.5pt;color:#8a8578;margin-top:4px}
.scale-note{font-size:8.5pt;color:#8a8578;margin:6px 0 0}
.body{padding:0 2px 24px}
.chapter{border-top:2px solid #06101c;padding-top:14px;margin-top:18px}
.chapter-no{font-size:9pt;color:#8a7020;margin:0}
.chapter h2{font-family:"Noto Serif KR",serif;font-size:18px;margin:4px 0 8px;color:#06101c}
.question{color:#8a7020;font-size:10pt;margin:0 0 8px}
.bridge{font-size:10pt;color:#5a5348;font-style:italic;margin:0 0 8px}
.lead{font-weight:600;font-size:11pt;margin:0 0 8px}
.paradox{border-left:3px solid #c9a227;padding:6px 10px;background:rgba(201,162,39,.08);margin:8px 0;font-size:10pt}
.scene-list{list-style:none;padding:0;margin:8px 0}
.scene-card{background:#fff;border:1px solid #ece4d6;padding:8px 10px;margin:6px 0;border-radius:2px}
.split-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0;font-size:10pt}
.insight-box{border:1px solid rgba(201,162,39,.4);background:rgba(201,162,39,.06);padding:10px 12px;margin-top:10px}
.insight-label{font-size:9pt;color:#8a7020;margin:0 0 6px;font-weight:600}
.evidence-line,.muted{color:#7a7268;font-size:8.75pt;margin-top:6px}
.gold{color:#8a7020}
.takeaway{color:#8a7020;margin-top:8px;font-weight:600}
.spread-title{font-family:"Noto Serif KR",serif;font-size:20px;margin:0 0 4px}
.life-grid{list-style:none;padding:0;margin:12px 0;display:grid;gap:8px}
.life-chip{background:#fff;border:1px solid #e2d8c8;padding:10px 12px;display:flex;gap:10px;align-items:flex-start}
.life-no{flex:0 0 22px;height:22px;border-radius:50%;background:#06101c;color:#f4ecde;font-size:10px;display:flex;align-items:center;justify-content:center}
.contra-card,.shadow-ladder,.blueprint{border:1px solid #e2d8c8;background:#fffdf9;padding:12px;margin:10px 0}
.contra-poles{display:flex;gap:8px;align-items:center;font-weight:600;color:#06101c;margin-bottom:6px}
.contra-x{color:#c9a227}
.contra-result{margin:8px 0;padding:8px;background:rgba(6,16,28,.04);font-size:10pt}
.tri-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:9.5pt;margin-top:8px}
.shadow-top{font-family:"Noto Serif KR",serif;font-size:14px;color:#8a7020;margin:0}
.shadow-arrow{color:#8a8578;font-size:9pt;margin:4px 0}
.shadow-balance{margin-top:8px;padding-top:8px;border-top:1px dashed #ddd4c4}
.action-row{border:1px solid #ece4d6;background:#fff;padding:10px;margin:8px 0;list-style:none}
.action-when{font-size:9pt;color:#8a7020;margin:0 0 4px}
.action-do,.action-why,.action-how{margin:2px 0;font-size:10pt}
.final-block{page-break-before:always;border:2px solid #06101c;padding:18px;background:#fffdf9}
.final-block h2{font-family:"Noto Serif KR",serif;font-size:20px;margin:0 0 12px}
.scope{font-size:8.5pt;color:#8a8578;margin-top:16px;padding-top:10px;border-top:1px solid #e6ddcf;line-height:1.5}
blockquote{border-left:3px solid #c9a227;margin:8px 0;padding-left:10px;color:#5a5348;font-family:"Noto Serif KR",serif}
ul{padding-left:0}
</style></head><body>
<section class="cover" data-shot="cover">
  <p class="brand">運의結</p>
  <h1>${esc(input.nickname)}님의<br/>${esc(coverKo)}</h1>
  <p class="sub">${esc(input.productName)}</p>
  <p class="en">${coverEn}</p>
  <p class="meta">주문번호 ${esc(input.orderNo)} · ${esc(new Date().toISOString().slice(0, 10))}</p>
</section>

<section class="profile-page" data-shot="profile">
  <p class="kicker">${isMoney ? "MY MONEY PROFILE" : "MY CORE PROFILE"}</p>
  <h2 class="serif">${esc(r.signatureStatement)}</h2>
  ${profileRows}
  ${scales ? `<div class="scales">${scales}</div>` : ""}
</section>

<div class="body">
${blueprint}
${r.freeBridge ? `<p class="muted">${esc(r.freeBridge)}</p>` : ""}
${lifeSpread ? `<section class="page-block" data-shot="life-spread"><p class="kicker">이런 장면, 익숙하지 않나요?</p><h2 class="spread-title serif">나의 장면</h2><ul class="life-grid">${lifeSpread}</ul></section>` : ""}
${chapters}
${contradictions ? `<section class="page-block" data-shot="contradiction"><p class="kicker">사람 안의 충돌</p><h2 class="spread-title serif">Contradiction Map</h2>${contradictions}</section>` : ""}
${shadows ? `<section class="page-block" data-shot="shadow"><p class="kicker">Strength → Shadow</p><h2 class="spread-title serif">강점이 약점으로</h2>${shadows}</section>` : ""}
<section><p class="kicker">Action Checklist</p><ul>${actions}</ul></section>
<section class="final-block" data-shot="final">
  <h2 class="serif">運의結 결론</h2>
  <p class="kicker">강점</p><ul>${list(fs_.strengths)}</ul>
  <p class="kicker">주의</p><ul>${list(fs_.cautions)}</ul>
  ${fs_.changeHabits ? `<p class="kicker">바꿀 습관</p><ul>${list(fs_.changeHabits)}</ul>` : ""}
  ${fs_.keepHabits ? `<p class="kicker">유지할 방식</p><ul>${list(fs_.keepHabits)}</ul>` : ""}
  <p class="gold serif" style="font-size:13pt;margin-top:12px">${esc(fs_.closingLine)}</p>
  ${r.scopeNotes ? `<p class="scope">${esc(r.scopeNotes)}</p>` : ""}
  <p class="scope">${esc(r.disclaimer)}</p>
</section>
</div>
</body></html>`;
}
