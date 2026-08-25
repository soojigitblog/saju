/**
 * PHASE P3 — Paid Tarot deep reading HTML V5 (print/screenshot).
 */
import type { PaidCrossReading } from "@/lib/ai/schemas/paid-cross-reading";
import { v5BaseCss, v5FontsHead } from "@/lib/report/v5/css";
import { coverTitleForProduct } from "@/lib/report/v5/tokens";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function footer(page: number, total: number) {
  return `<div class="footer sans"><span>運의結</span><span class="pn">${page} / ${total}</span></div>`;
}

export function buildPaidTarotHtmlV5(input: {
  nickname: string;
  productName: string;
  reading: PaidCrossReading;
}): string {
  const r = input.reading;
  const total = 6;
  const cover = coverTitleForProduct(input.nickname, "tarot");
  const oneLiner =
    r.shareableInsight[0] ?? r.closingInsight ?? r.hiddenTension.collision;

  const body = `
<div class="page cover sans" data-shot="hero" data-layout="cover">
  <div class="cover-stage">
    <p class="brand-mark">${cover.brandLine}</p>
    <div class="cover-ornament"></div>
    <h1 class="serif">${esc(cover.titleLines[0])}<br/>${esc(cover.titleLines[1])}</h1>
    <p class="sub">${esc(input.productName)}</p>
    <p class="en">Deep Cross Reading</p>
  </div>
  ${footer(1, total)}
</div>

<div class="page paper sans tarot-hero" data-shot="hero" data-layout="tarot-hero">
  <p class="kicker">이번 고민</p>
  <p class="q serif">${esc(r.questionSummary.structured)}</p>
  <p class="caption">원문 · ${esc(r.questionSummary.original)}</p>
  <div class="rule"></div>
  <p class="kicker">이 고민에서 가장 중요한 한 문장</p>
  <p class="pull serif">${esc(oneLiner)}</p>
  <div class="card-row">
    ${r.cards
      .map(
        (c) => `<div class="tcard">
      <p class="role">${esc(c.positionLabel)}</p>
      <p class="name">${esc(c.nameKo)}</p>
      <p class="ori">${c.orientation === "UPRIGHT" ? "정방향" : "역방향"}</p>
    </div>`
      )
      .join("")}
  </div>
  ${footer(2, total)}
</div>

<div class="page tint sans" data-shot="cards" data-layout="editorial-feature">
  <p class="kicker">카드별 의미</p>
  <h2 class="part-title serif">세 장의 장면</h2>
  ${r.cardInterpretations
    .map((ci, i) => {
      const card = r.cards[i];
      return `<div class="pattern"><h3 class="serif">${esc(card?.positionLabel ?? "")} · ${esc(card?.nameKo ?? "")}</h3><p class="body">${esc(ci.body)}</p></div>`;
    })
    .join("")}
  <p class="pull serif">${esc(r.threeCardStory)}</p>
  ${footer(3, total)}
</div>

<div class="page paper sans" data-shot="cross-connection" data-layout="pattern-spread">
  <p class="kicker">사주 × 타로</p>
  <h2 class="part-title serif">교차 연결</h2>
  <p class="lead">${esc(r.sajuBaseline.summary)}</p>
  ${r.crossConnections
    .map(
      (cc) => `<div class="cross">
    <p class="poles">사주 · ${esc(cc.sajuSignal)}<br/>타로 · ${esc(cc.tarotSignal)}</p>
    <p class="body">${esc(cc.connection)}</p>
    <p class="caption">현실에서 · ${esc(cc.practicalMeaning)}</p>
  </div>`
    )
    .join("")}
  ${footer(4, total)}
</div>

<div class="page tint sans" data-shot="hidden-tension" data-layout="contradiction">
  <p class="kicker">이번 고민에서 부딪히는 두 힘</p>
  <h2 class="part-title serif">숨은 긴장</h2>
  <div class="tension-box">
    <p class="col-h">평소의 방식</p>
    <p class="body">${esc(r.hiddenTension.innateWay)}</p>
    <p class="col-h" style="margin-top:12px">지금 카드의 압력</p>
    <p class="body">${esc(r.hiddenTension.cardPressure)}</p>
  </div>
  <p class="pull serif">${esc(r.hiddenTension.collision)}</p>
  <p class="caption">놓치기 쉬운 지점 · ${esc(r.whatToWatch)}</p>
  <p class="caption">${esc(r.hiddenTension.riskIfIgnored)}</p>
  ${footer(5, total)}
</div>

<div class="page paper sans" data-shot="action" data-layout="playbook">
  <p class="kicker">선택 · 행동</p>
  <h2 class="part-title serif">지금 어떻게 볼까</h2>
  <div class="two">
    <div><p class="col-h">선택지 A</p><p class="body">${esc(r.choicePerspective.optionA)}</p></div>
    <div><p class="col-h">선택지 B</p><p class="body">${esc(r.choicePerspective.optionB)}</p></div>
  </div>
  <p class="kicker" style="margin-top:14px">결정 전에 확인할 것</p>
  ${r.choicePerspective.checkBeforeDecide.map((x) => `<p class="body">· ${esc(x)}</p>`).join("")}
  <div class="rule"></div>
  <p class="kicker">현실 행동</p>
  ${r.actionOptions
    .map(
      (a, i) =>
        `<div class="play"><p class="n">ACTION ${String(i + 1).padStart(2, "0")}</p><p class="body">${esc(a)}</p></div>`
    )
    .join("")}
  <p class="closing serif">${esc(r.closingInsight)}</p>
  <div class="share-block" data-shot="final"><p class="label sans">저장해 두고 싶은 한 문장</p><p class="line">${esc(r.shareableInsight[0] ?? "")}</p></div>
  <p class="caption" style="margin-top:12px">${esc(r.disclaimer)}</p>
  ${footer(6, total)}
</div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(input.productName)} — 運의結 V5</title>
${v5FontsHead()}
<style>${v5BaseCss()}</style>
</head>
<body class="sans">${body}</body>
</html>`;
}
