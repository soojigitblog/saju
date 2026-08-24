/**
 * PHASE P1.4 — Fixed-page editorial PDF HTML (blank-page safe).
 */
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionByKey(report: PaidFortuneReport, key: string): PaidSection | undefined {
  return report.sections.find((s) => s.key === key);
}

function scenesHtml(scenes: string[] | undefined) {
  return (scenes ?? [])
    .map((s) => `<p class="body-text scene">${esc(s)}</p>`)
    .join("");
}

function whyHtml(section: PaidSection | undefined) {
  if (!section?.includeWhyBox || !section.evidenceExplanation?.length) return "";
  return `<div class="reason-block">${section.evidenceExplanation.map((p) => `<p class="caption">${esc(p)}</p>`).join("")}</div>`;
}

function pillarCell(
  label: string,
  stem: string,
  branch: string,
  tgStem: string,
  tgBranch: string,
  missing?: boolean
) {
  if (missing) {
    return `<div class="pillar missing"><p class="pillar-label">${label}</p><p class="pillar-gan">時柱</p><p class="pillar-sub">미상</p></div>`;
  }
  return `<div class="pillar"><p class="pillar-label">${label}</p><p class="pillar-gan">${esc(stem)}<span>${esc(branch)}</span></p><p class="pillar-sub">${esc(tgStem)} · ${esc(tgBranch)}</p></div>`;
}

const BASE_CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;margin:0;padding:0;background:#f4efe6}
.page{width:210mm;height:297mm;padding:14mm 16mm;page-break-after:always;break-after:page;overflow:hidden;position:relative;background:#faf7f2}
.page.alt{background:#fff}
.page.cover-page{background:linear-gradient(165deg,#06101c,#0f1a2e 55%,#1a2840);color:#f3ebde}
.page:last-child{page-break-after:auto}
.serif{font-family:"Noto Serif KR",serif}
.sans{font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
.brand{font-family:"Noto Serif KR",serif;font-size:11pt;color:#c9a227;letter-spacing:0.02em}
.meta{font-size:7.5pt;color:#8a8578;margin-top:auto}
.kicker{font-size:8pt;color:#8a7020;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
.part-title{font-family:"Noto Serif KR",serif;font-size:20pt;line-height:1.35;color:#06101c;margin-bottom:10px;font-weight:600}
.lead{font-size:11.5pt;line-height:1.65;font-weight:600;color:#121820;margin:8px 0}
.body-text{font-size:10.75pt;line-height:1.68;color:#2a3340;margin:6px 0}
.caption{font-size:8.75pt;line-height:1.55;color:#6b6458;margin:4px 0}
.gold{color:#8a7020}
.divider{height:1px;background:linear-gradient(90deg,transparent,#c9a22755,transparent);margin:12px 0}
.rule-thin{height:1px;background:#d8cfc0;margin:10px 0}
.pull{font-family:"Noto Serif KR",serif;font-size:13pt;line-height:1.5;color:#5a5348;border-left:2px solid #c9a227;padding-left:10px;margin:10px 0}
.profile-lead{font-family:"Noto Serif KR",serif;font-size:15pt;line-height:1.55;color:#06101c;margin:12px 0 16px}
.dash{display:grid;grid-template-columns:7.5rem 1fr;gap:6px;padding:7px 0;border-bottom:1px solid #e8e0d4;font-size:10.5pt}
.dash .l{color:#7a7268}.dash .v{color:#1a2430}
.scale-row{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:10pt}
.scale-row .bar{flex:1;height:5px;background:#e6ddcf;border-radius:3px;overflow:hidden}
.scale-row .bar i{display:block;height:100%;background:linear-gradient(90deg,#8a7020,#c9a227)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}
.col-head{font-size:10pt;font-weight:600;color:#8a7020;margin-bottom:6px}
.pillar-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
.pillar{border:1px solid #ddd4c4;background:#fff;padding:10px 8px;text-align:center}
.pillar.missing{opacity:0.65;background:#f8f5ef}
.pillar-label{font-size:8pt;color:#8a7020;margin-bottom:4px}
.pillar-gan{font-family:"Noto Serif KR",serif;font-size:16pt;color:#06101c}
.pillar-gan span{font-size:14pt;margin-left:4px}
.pillar-sub{font-size:8pt;color:#7a7268;margin-top:4px}
.fe-row{display:flex;align-items:flex-end;gap:8px;height:72px;margin:12px 0}
.fe-col{flex:1;text-align:center}
.fe-bar{width:100%;background:linear-gradient(180deg,#c9a227,#8a7020);border-radius:2px 2px 0 0}
.fe-label{font-size:9pt;margin-top:4px;color:#8a7020}
.fe-n{font-size:8pt;color:#7a7268}
.timeline{display:grid;gap:6px;margin-top:8px}
.timeline .step{display:flex;gap:10px;align-items:flex-start}
.timeline .n{font-family:"Noto Serif KR",serif;font-size:11pt;color:#8a7020;min-width:1.2rem}
.contra{margin:10px 0;padding-bottom:10px;border-bottom:1px solid #ece4d6}
.contra:last-child{border:none}
.contra-ab{display:flex;gap:8px;align-items:center;font-weight:600;font-size:10.5pt;color:#06101c;margin-bottom:4px}
.shadow-flow{margin:12px 0}
.shadow-flow .num{font-family:"Noto Serif KR",serif;font-size:18pt;color:#c9a227;line-height:1}
.shadow-flow h3{font-family:"Noto Serif KR",serif;font-size:12pt;margin:4px 0 6px;color:#06101c}
.play-item{margin:10px 0;padding-left:12px;border-left:2px solid #d8cfc0}
.portrait{font-family:"Noto Serif KR",serif;font-size:11pt;line-height:1.72;color:#2a3340;margin:8px 0}
.kwu{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;font-size:9pt}
.kwu b{display:block;color:#8a7020;margin-bottom:4px;font-size:8pt}
.footer-meta{position:absolute;bottom:10mm;left:16mm;right:16mm;font-size:7pt;color:#9a9078;display:flex;justify-content:space-between}
.cover-inner{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20mm 10mm}
.cover-inner h1{font-family:"Noto Serif KR",serif;font-size:32pt;line-height:1.32;font-weight:700;margin:20px 0 10px}
.cover-inner .sub{font-size:14pt;color:#d8ccb8}
.cover-inner .en{font-size:9pt;color:#9a9078;margin-top:28px;letter-spacing:0.04em}
.core-hub{text-align:center;margin:16px 0 20px;padding:16px 10px;border-top:1px solid #d8cfc0;border-bottom:1px solid #d8cfc0}
.core-hub p{font-family:"Noto Serif KR",serif;font-size:14pt;line-height:1.55;color:#06101c}
.domains{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:12px}
.domains .d{font-size:10pt}.domains .d b{color:#8a7020;font-weight:600;display:inline-block;min-width:3.2rem}
`;

function fontsHead() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet"/>`;
}

function pageFooter(meta: string) {
  return `<div class="footer-meta sans"><span>運의結</span><span>${esc(meta)}</span></div>`;
}

function buildMoneyPages(input: {
  nickname: string;
  productName: string;
  report: PaidFortuneReport;
  dateLabel: string;
}): string {
  const r = input.report;
  const s = (k: string) => sectionByKey(r, k);
  const dash = (r.profileDashboard ?? [])
    .map((d) => `<div class="dash sans"><span class="l">${esc(d.label)}</span><span class="v">${esc(d.value)}</span></div>`)
    .join("");
  const scales = (r.profileScales ?? [])
    .map((sc) => {
      const w = sc.level === "low" ? "33%" : sc.level === "high" ? "82%" : "55%";
      return `<div class="scale-row sans"><span style="min-width:5rem">${esc(sc.label)}</span><div class="bar"><i style="width:${w}"></i></div><span class="gold" style="font-size:8.5pt">${sc.level === "low" ? "낮음" : sc.level === "high" ? "높음" : "중간"}</span></div>`;
    })
    .join("");

  const fs = r.finalSummary;
  const playbook = s("money_v4_playbook");

  return `
<div class="page cover-page sans" data-shot="cover">
  <div class="cover-inner">
    <p class="brand">運의結</p>
    <h1 class="serif">${esc(input.nickname)}님의<br/>재물 사용설명서</h1>
    <p class="sub">${esc(input.productName)}</p>
    <p class="en">Money Reading</p>
  </div>
  ${pageFooter(input.dateLabel)}
</div>

<div class="page alt sans" data-shot="profile">
  <p class="kicker">My Money Profile</p>
  <p class="profile-lead serif">${esc(r.signatureStatement)}</p>
  <p class="caption">이 사주에서 돈을 볼 때 가장 먼저 읽히는 것</p>
  ${dash}
  <div class="divider"></div>
  ${scales}
  ${pageFooter("재물 사용설명서")}
</div>

<div class="page sans" data-shot="structure">
  <p class="kicker">01 · 구조</p>
  <h2 class="part-title serif">${esc(s("money_v4_structure")?.title ?? "")}</h2>
  <p class="lead">${esc(s("money_v4_structure")?.coreInsight ?? "")}</p>
  ${s("money_v4_structure")?.pullQuote ? `<p class="pull serif">${esc(s("money_v4_structure")!.pullQuote!)}</p>` : ""}
  ${scenesHtml(s("money_v4_structure")?.behaviorScenes)}
  ${whyHtml(s("money_v4_structure"))}
  ${pageFooter("내 돈의 기본 구조")}
</div>

<div class="page alt sans" data-shot="earn-spend">
  <p class="kicker">02 · 수입과 지출</p>
  <h2 class="part-title serif">${esc(s("money_v4_earn_spend")?.title ?? "")}</h2>
  <p class="lead">${esc(s("money_v4_earn_spend")?.coreInsight ?? "")}</p>
  <div class="two-col">
    <div><p class="col-head">돈을 벌 때</p>${(s("money_v4_earn_spend")?.behaviorScenes ?? []).slice(0, 2).map((x) => `<p class="body-text">${esc(x.replace(/^【벌 때】/, ""))}</p>`).join("")}</div>
    <div><p class="col-head">돈을 쓸 때</p>${(s("money_v4_earn_spend")?.behaviorScenes ?? []).slice(2, 4).map((x) => `<p class="body-text">${esc(x.replace(/^【쓸 때】/, ""))}</p>`).join("")}</div>
  </div>
  ${pageFooter("벌기 vs 쓰기")}
</div>

<div class="page sans" data-shot="blindspot">
  <p class="kicker">03 · 사각지대</p>
  <h2 class="part-title serif">${esc(s("money_v4_blindspot")?.title ?? "")}</h2>
  <p class="lead">${esc(s("money_v4_blindspot")?.coreInsight ?? "")}</p>
  ${scenesHtml(s("money_v4_blindspot")?.behaviorScenes)}
  ${s("money_v4_blindspot")?.paradoxNote ? `<p class="pull serif">${esc(s("money_v4_blindspot")!.paradoxNote!)}</p>` : ""}
  ${whyHtml(s("money_v4_blindspot"))}
  ${pageFooter("돈의 사각지대")}
</div>

<div class="page alt sans" data-shot="work">
  <p class="kicker">04 · 일과 돈</p>
  <h2 class="part-title serif">${esc(s("money_v4_work")?.title ?? "")}</h2>
  <p class="lead">${esc(s("money_v4_work")?.coreInsight ?? "")}</p>
  ${scenesHtml(s("money_v4_work")?.behaviorScenes)}
  ${pageFooter("일·부업과 돈")}
</div>

<div class="page sans" data-shot="people">
  <p class="kicker">05 · 사람과 돈</p>
  <h2 class="part-title serif">${esc(s("money_v4_people")?.title ?? "")}</h2>
  <p class="lead">${esc(s("money_v4_people")?.coreInsight ?? "")}</p>
  ${scenesHtml(s("money_v4_people")?.behaviorScenes)}
  ${pageFooter("사람과 돈")}
</div>

<div class="page alt sans" data-shot="playbook">
  <p class="kicker">06 · 플레이북</p>
  <h2 class="part-title serif">${esc(playbook?.title ?? "나의 재물 플레이북")}</h2>
  ${(playbook?.behaviorScenes ?? []).map((p) => `<div class="play-item"><p class="body-text">${esc(p)}</p></div>`).join("")}
  <div class="rule-thin"></div>
  <p class="kicker">마무리</p>
  ${(fs.portraitNarrative ?? []).map((p) => `<p class="portrait">${esc(p)}</p>`).join("")}
  <p class="lead gold serif" style="margin-top:12px">${esc(fs.closingLine)}</p>
  <p class="caption" style="margin-top:10px">${esc(r.scopeNotes ?? "")}</p>
  ${pageFooter("Final")}
</div>`;
}

function buildTotalPages(input: {
  nickname: string;
  productName: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  dateLabel: string;
}): string {
  const r = input.report;
  const ctx = input.ctx;
  const s = (k: string) => sectionByKey(r, k);
  const fe = ctx.fiveElements;
  const maxFe = Math.max(fe.wood, fe.fire, fe.earth, fe.metal, fe.water, 1);
  const feBars = [
    { l: "木", n: fe.wood },
    { l: "火", n: fe.fire },
    { l: "土", n: fe.earth },
    { l: "金", n: fe.metal },
    { l: "水", n: fe.water },
  ]
    .map(
      (x) =>
        `<div class="fe-col"><div class="fe-bar" style="height:${Math.round((x.n / maxFe) * 64)}px"></div><div class="fe-label">${x.l}</div><div class="fe-n">${x.n}</div></div>`
    )
    .join("");

  const pillars = ctx.birthTimeUnknown
    ? [
        pillarCell("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillarCell("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillarCell("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillarCell("時柱", "", "", "", "", true),
      ]
    : [
        pillarCell("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillarCell("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillarCell("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillarCell("時柱", ctx.pillars.hour!.stem, ctx.pillars.hour!.branch, ctx.tenGods.hour!.stem, ctx.tenGods.hour!.branch),
      ];

  const domains = (r.profileDashboard ?? [])
    .slice(0, 6)
    .map((d) => `<div class="d"><b>${esc(d.label)}</b> ${esc(d.value)}</div>`)
    .join("");
  const extra = (r.profileDashboard ?? []).slice(6);
  const fs = r.finalSummary;

  const contraHtml = (r.contradictions ?? [])
    .map(
      (c) => `<div class="contra"><div class="contra-ab sans"><span>${esc(c.poleA)}</span><span class="gold">↔</span><span>${esc(c.poleB)}</span></div><p class="body-text">${esc(c.howItShows)}</p>${c.result ? `<p class="caption">${esc(c.result)}</p>` : ""}</div>`
    )
    .join("");

  const shadowHtml = (r.strengthShadows ?? [])
    .map(
      (sh, i) =>
        `<div class="shadow-flow"><p class="num serif">${String(i + 1).padStart(2, "0")}</p><h3 class="serif">${esc(sh.strength)}</h3><p class="body-text">과해질 때 — ${esc(sh.overuse)}</p><p class="body-text">균형 — ${esc(sh.balancePoint ?? "")}</p></div>`
    )
    .join("");

  return `
<div class="page cover-page sans" data-shot="cover">
  <div class="cover-inner">
    <p class="brand">運의結</p>
    <h1 class="serif">${esc(input.nickname)}님의<br/>사주 사용설명서</h1>
    <p class="sub">${esc(input.productName)}</p>
    <p class="en">Personal Four Pillars Reading</p>
  </div>
  ${pageFooter(input.dateLabel)}
</div>

<div class="page alt sans" data-shot="profile">
  <p class="kicker">Core Profile</p>
  <div class="core-hub"><p class="serif">이 사람을 움직이는 핵심</p><p class="profile-lead serif" style="margin:10px 0 0">${esc(r.signatureStatement)}</p></div>
  <div class="domains">${domains}</div>
  ${extra.map((e) => `<p class="body-text" style="margin-top:8px"><b class="gold">${esc(e.label)}</b> · ${esc(e.value)}</p>`).join("")}
  ${pageFooter("Core Profile")}
</div>

<div class="page sans" data-shot="saju-map">
  <p class="kicker">My Saju Map</p>
  <h2 class="part-title serif">나의 四柱</h2>
  <p class="caption">日干 ${esc(ctx.dayMaster.stem)}(${esc(ctx.dayMaster.hangul)}) · ${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} ${esc(ctx.dayMaster.element)}</p>
  <div class="pillar-grid">${pillars.join("")}</div>
  <p class="kicker" style="margin-top:14px">五行 Snapshot</p>
  <div class="fe-row">${feBars}</div>
  <p class="kicker">이 명식에서 중요하게 볼 3가지</p>
  <p class="body-text">1. ${esc(r.blueprint?.dayMasterPlain ?? "")}</p>
  <p class="body-text">2. ${esc(r.blueprint?.structurePlain ?? "")}</p>
  <p class="body-text">3. ${esc(r.blueprint?.lifePlain ?? "")}</p>
  ${pageFooter("My Saju Map")}
</div>

<div class="page alt sans" data-shot="decision">
  <p class="kicker">판단</p>
  <h2 class="part-title serif">${esc(s("total_v4_decision")?.title ?? "")}</h2>
  <p class="lead">${esc(s("total_v4_decision")?.coreInsight ?? "")}</p>
  ${scenesHtml(s("total_v4_decision")?.behaviorScenes)}
  ${whyHtml(s("total_v4_decision"))}
  ${pageFooter("판단")}
</div>

<div class="page sans" data-shot="relationship">
  <p class="kicker">관계</p>
  <h2 class="part-title serif">${esc(s("total_v4_relationship")?.title ?? "")}</h2>
  <div class="timeline">${(s("total_v4_relationship")?.behaviorScenes ?? []).map((x, i) => `<div class="step"><span class="n">${i + 1}</span><p class="body-text">${esc(x)}</p></div>`).join("")}</div>
  ${pageFooter("관계")}
</div>

<div class="page alt sans" data-shot="work">
  <p class="kicker">일</p>
  <h2 class="part-title serif">${esc(s("total_v4_work")?.title ?? "")}</h2>
  <div class="two-col">
    <div><p class="col-head">잘 맞기 쉬운 환경</p>${(s("total_v4_work")?.behaviorScenes ?? []).slice(0, 2).map((x) => `<p class="body-text">${esc(x)}</p>`).join("")}</div>
    <div><p class="col-head">지치기 쉬운 환경</p>${(s("total_v4_work")?.behaviorScenes ?? []).slice(2, 4).map((x) => `<p class="body-text">${esc(x)}</p>`).join("")}</div>
  </div>
  ${pageFooter("일과 성취")}
</div>

<div class="page sans" data-shot="money">
  <p class="kicker">돈</p>
  <h2 class="part-title serif">${esc(s("total_v4_money_link")?.title ?? "")}</h2>
  <p class="lead">${esc(s("total_v4_money_link")?.coreInsight ?? "")}</p>
  ${scenesHtml(s("total_v4_money_link")?.behaviorScenes)}
  <p class="caption">더 깊은 재물 분석은 재물 집중 리포트에서 다룹니다.</p>
  ${pageFooter("돈과 통제")}
</div>

<div class="page alt sans" data-shot="love">
  <p class="kicker">사랑</p>
  <h2 class="part-title serif">${esc(s("total_v4_love")?.title ?? "")}</h2>
  <div class="timeline">${(s("total_v4_love")?.behaviorScenes ?? []).map((x, i) => `<div class="step"><span class="n">${i + 1}</span><p class="body-text">${esc(x)}</p></div>`).join("")}</div>
  ${pageFooter("사랑과 거리")}
</div>

<div class="page sans" data-shot="stress">
  <p class="kicker">스트레스</p>
  <h2 class="part-title serif">${esc(s("total_v4_stress")?.title ?? "")}</h2>
  <div class="timeline">${(s("total_v4_stress")?.behaviorScenes ?? []).map((x, i) => `<div class="step"><span class="n">${i + 1}</span><p class="body-text">${esc(x)}</p></div>`).join("")}</div>
  ${whyHtml(s("total_v4_stress"))}
  ${pageFooter("스트레스와 회복")}
</div>

<div class="page alt sans" data-shot="contradiction">
  <p class="kicker">모순</p>
  <h2 class="part-title serif">나의 모순</h2>
  ${contraHtml}
  ${pageFooter("모순")}
</div>

<div class="page sans" data-shot="shadow">
  <p class="kicker">강점과 그림자</p>
  <h2 class="part-title serif">Strength → Shadow</h2>
  ${shadowHtml}
  ${pageFooter("Strength Shadow")}
</div>

<div class="page alt sans" data-shot="playbook">
  <p class="kicker">Playbook</p>
  <h2 class="part-title serif">${esc(s("total_v4_playbook")?.title ?? "")}</h2>
  ${(s("total_v4_playbook")?.behaviorScenes ?? []).map((p) => `<div class="play-item"><p class="body-text">${esc(p)}</p></div>`).join("")}
  ${pageFooter("Playbook")}
</div>

<div class="page sans" data-shot="final">
  <p class="kicker">Final Portrait</p>
  <h2 class="part-title serif">${esc(input.nickname)}님이라는 사람을 다시 정리하면</h2>
  ${(fs.portraitNarrative ?? []).map((p) => `<p class="portrait">${esc(p)}</p>`).join("")}
  <div class="kwu sans">
    <div><b>KEEP</b>${(fs.keepItems ?? fs.keepHabits ?? []).map((x) => `<p>${esc(x)}</p>`).join("")}</div>
    <div><b>WATCH</b>${(fs.watchItems ?? fs.cautions ?? []).slice(0, 2).map((x) => `<p>${esc(x)}</p>`).join("")}</div>
    <div><b>USE</b>${(fs.useItems ?? fs.changeHabits ?? []).map((x) => `<p>${esc(x)}</p>`).join("")}</div>
  </div>
  <p class="lead gold serif" style="margin-top:16px">${esc(fs.closingLine)}</p>
  <p class="caption" style="margin-top:12px">${esc(r.scopeNotes ?? "")}</p>
  ${pageFooter("Final Portrait")}
</div>`;
}

export function buildPaidReportPdfHtmlV4(input: {
  nickname: string;
  productName: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  dateLabel?: string;
}): string {
  const dateLabel = input.dateLabel ?? new Date().toISOString().slice(0, 10);
  const body =
    input.report.reportKind === "money"
      ? buildMoneyPages({ ...input, dateLabel })
      : buildTotalPages({ ...input, dateLabel, ctx: input.ctx });

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<title>${esc(input.productName)}</title>
${fontsHead()}
<style>${BASE_CSS}</style></head><body class="sans">${body}</body></html>`;
}
