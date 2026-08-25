/**
 * PHASE P3 — InsightShareCardV1 HTML (1080×1350) for PNG export.
 */
import {
  buildInsightShareCard,
  type InsightShareCardV1,
} from "@/lib/product/share-insight-card";
import { V5_COLORS as C, V5_FONTS as F } from "@/lib/report/v5/tokens";
import { v5FontsHead } from "@/lib/report/v5/css";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInsightShareCardHtmlV5(card: InsightShareCardV1): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>運의結 Insight</title>
${v5FontsHead()}
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden;background:${C.navy}}
.card{
  width:1080px;height:1350px;
  padding:96px 88px 88px;
  background:linear-gradient(165deg,${C.navy} 0%,#101c30 55%,#152438 100%);
  color:${C.ivory};
  display:flex;flex-direction:column;
  font-family:${F.sans};
}
.brand{
  font-family:${F.serif};
  font-size:28px;letter-spacing:0.12em;color:${C.goldSoft};
}
.orn{width:56px;height:1px;background:${C.goldDim};margin:36px 0 48px}
.domain{
  font-size:18px;letter-spacing:0.08em;color:${C.muted};margin-bottom:28px;
}
.insight{
  font-family:${F.serif};
  font-size:46px;line-height:1.45;font-weight:600;color:${C.ivory};
  flex:1;
}
.context{
  margin-top:36px;font-size:22px;line-height:1.55;color:#b8aea0;
}
.foot{
  margin-top:auto;padding-top:48px;
  border-top:1px solid ${C.goldDim};
  display:flex;justify-content:space-between;align-items:flex-end;
}
.cta{font-size:20px;color:${C.goldSoft};letter-spacing:0.04em}
.quiet{font-size:16px;color:${C.muted}}
</style>
</head>
<body>
<div class="card" data-shot="share">
  <p class="brand">運의結</p>
  <div class="orn"></div>
  <p class="domain">${esc(card.domainLabel)}</p>
  <p class="insight">${esc(card.insightLine)}</p>
  ${card.contextLine ? `<p class="context">${esc(card.contextLine)}</p>` : ""}
  <div class="foot">
    <p class="cta">${esc(card.cta.label)}</p>
    <p class="quiet">運의結</p>
  </div>
</div>
</body>
</html>`;
}

export function buildShareCardForDomain(input: {
  domainLabel: InsightShareCardV1["domainLabel"];
  insightLine: string;
  contextLine?: string;
}): { card: InsightShareCardV1; html: string } {
  const card = buildInsightShareCard(input);
  return { card, html: buildInsightShareCardHtmlV5(card) };
}
