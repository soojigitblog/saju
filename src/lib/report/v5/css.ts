import fs from "node:fs";
import path from "node:path";
import { V5_COLORS as C } from "@/lib/report/v5/tokens";

/** Absolute file URLs for Playwright PDF — static OTF preferred (avoid VF→Type3). */
export function v5LocalFontFaces(projectRoot = process.cwd()): string {
  const dir = path.join(projectRoot, "assets", "fonts");
  const dirUrl = dir.replace(/\\/g, "/");
  const has = (name: string) => fs.existsSync(path.join(dir, name));
  const useStatic =
    has("NotoSerifKR-Regular.otf") &&
    has("NotoSerifKR-Bold.otf") &&
    has("NotoSansKR-Regular.otf") &&
    has("NotoSansKR-Bold.otf");

  if (useStatic) {
    return `
@font-face{
  font-family:"Noto Serif KR Local";
  src:url("file:///${dirUrl}/NotoSerifKR-Regular.otf") format("opentype");
  font-weight:400;font-style:normal;font-display:block;
}
@font-face{
  font-family:"Noto Serif KR Local";
  src:url("file:///${dirUrl}/NotoSerifKR-Bold.otf") format("opentype");
  font-weight:600 700;font-style:normal;font-display:block;
}
@font-face{
  font-family:"Noto Sans KR Local";
  src:url("file:///${dirUrl}/NotoSansKR-Regular.otf") format("opentype");
  font-weight:400;font-style:normal;font-display:block;
}
@font-face{
  font-family:"Noto Sans KR Local";
  src:url("file:///${dirUrl}/NotoSansKR-Bold.otf") format("opentype");
  font-weight:600 700;font-style:normal;font-display:block;
}`;
  }

  // Fallback: local VF copies (may still Type3 — report WARNING, never false PASS)
  return `
@font-face{
  font-family:"Noto Serif KR Local";
  src:url("file:///${dirUrl}/NotoSerifKR-VF.ttf") format("truetype");
  font-weight:100 900;font-style:normal;font-display:block;
}
@font-face{
  font-family:"Noto Sans KR Local";
  src:url("file:///${dirUrl}/NotoSansKR-VF.ttf") format("truetype");
  font-weight:100 900;font-style:normal;font-display:block;
}`;
}

export function v5FontsHead(projectRoot = process.cwd()): string {
  return `<style>${v5LocalFontFaces(projectRoot)}</style>`;
}

const SERIF = '"Noto Serif KR Local"';
const SANS = '"Noto Sans KR Local"';

/** Shared V5.2 / Final print CSS — flow editorial, denser pages. */
export function v5BaseCss(): string {
  return `
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:210mm;margin:0;padding:0;
  background:${C.ivory};
  color:${C.ink};
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
  font-family:${SANS},sans-serif;
}
.page{
  width:210mm;height:297mm;
  padding:14mm 16mm 16mm;
  page-break-after:always;break-after:page;
  overflow:hidden;position:relative;
  background:${C.ivoryAlt};
}
.page.paper{background:${C.paper}}
.page.tint{background:linear-gradient(180deg,${C.ivory} 0%,${C.ivoryAlt} 100%)}
.page.cover{
  background:linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 52%,#1a2d48 100%);
  color:${C.ivory};padding:0;
}
.page:last-child{page-break-after:auto}
.serif{font-family:${SERIF},serif}
.sans{font-family:${SANS},sans-serif}

.brand-mark{font-family:${SERIF},serif;font-size:11pt;letter-spacing:0.08em;color:${C.goldSoft}}
.kicker{font-size:8.5pt;letter-spacing:0.04em;color:${C.gold};margin-bottom:6px}
.part-title{font-family:${SERIF},serif;font-size:19pt;line-height:1.35;font-weight:600;color:${C.navy};margin-bottom:8px}
.section-title{font-family:${SERIF},serif;font-size:13.5pt;line-height:1.4;font-weight:600;color:${C.navy};margin:10px 0 6px}
.lead{font-size:11pt;line-height:1.65;font-weight:600;color:${C.ink};margin:6px 0 10px}
.body{font-size:10.3pt;line-height:1.68;color:${C.body};margin:5px 0}
.caption{font-size:8.4pt;line-height:1.5;color:${C.warmGray};margin:4px 0}
.gold{color:${C.gold}}
.rule{height:1px;margin:10px 0;background:linear-gradient(90deg,transparent,${C.goldDim},transparent)}
.rule-soft{height:1px;background:${C.lineSoft};margin:8px 0}
.block{margin:10px 0 14px}

.pull{
  font-family:${SERIF},serif;font-size:12.5pt;line-height:1.5;color:${C.navy};
  border-left:2.5px solid ${C.gold};padding:2px 0 2px 12px;margin:10px 0;
}
.footer{
  position:absolute;bottom:9mm;left:16mm;right:16mm;
  display:flex;justify-content:space-between;align-items:center;
  font-size:7pt;color:${C.muted};
}
.footer .pn{font-variant-numeric:tabular-nums}

.cover-stage{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28mm 18mm}
.cover-ornament{width:48px;height:1px;background:${C.goldDim};margin:18px 0}
.cover-stage h1{font-family:${SERIF},serif;font-size:34pt;line-height:1.28;font-weight:700;color:${C.ivory};margin:8px 0}
.cover-stage .en{font-size:8.5pt;color:#8f8778;letter-spacing:0.06em;margin-top:36px;text-transform:uppercase;white-space:nowrap}
.cover-stage .sub{display:none}

.sig{font-family:${SERIF},serif;font-size:15pt;line-height:1.5;color:${C.navy};margin:8px 0 14px}
.dash-grid{display:grid;gap:0}
.dash-row{display:grid;grid-template-columns:6.5rem 1fr;gap:8px;padding:7px 0;border-bottom:1px solid ${C.lineSoft};font-size:10.2pt}
.dash-row .l{color:${C.warmGray}}.dash-row .v{color:${C.ink}}
.scale{display:flex;align-items:center;gap:10px;margin:7px 0;font-size:9.8pt}
.scale .bar{flex:1;height:4px;background:${C.lineSoft};overflow:hidden}
.scale .bar i{display:block;height:100%;background:linear-gradient(90deg,${C.gold},${C.goldSoft})}

.saju-map{margin:14px 0 16px}
.pillar-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.pillar{text-align:center;padding:16px 6px 14px;background:${C.paper};border-bottom:2px solid ${C.goldDim}}
.pillar .pl{font-size:8pt;color:${C.gold};letter-spacing:0.08em;margin-bottom:8px}
.pillar .gan{font-family:${SERIF},serif;font-size:24pt;line-height:1.1;color:${C.navy}}
.pillar .zhi{font-family:${SERIF},serif;font-size:18pt;color:${C.ink};margin-top:4px}
.pillar .meta{font-size:8pt;color:${C.warmGray};margin-top:8px;line-height:1.4}
.pillar.missing{opacity:0.55}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 12px;font-size:8.5pt;color:${C.warmGray}}
.fe-strip{display:flex;gap:8px;align-items:flex-end;height:72px;margin:14px 0 10px}
.fe-item{flex:1;text-align:center}
.fe-item .b{width:100%;background:linear-gradient(180deg,${C.goldSoft},${C.gold});border-radius:1px 1px 0 0}
.fe-item .t{font-size:9pt;color:${C.gold};margin-top:4px}
.fe-item .n{font-size:8pt;color:${C.muted}}
.signal{margin:10px 0;padding-left:12px;border-left:2px solid ${C.line}}
.signal .h{font-family:${SERIF},serif;font-size:11.5pt;color:${C.navy};margin-bottom:3px}
.signal .w{font-size:9.5pt;color:${C.body};line-height:1.55}

.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}
.col-h{font-family:${SERIF},serif;font-size:11.5pt;color:${C.gold};margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${C.lineSoft}}
.tl{margin-top:6px}
.tl-step{display:grid;grid-template-columns:1.8rem 1fr;gap:8px;padding:6px 0;border-bottom:1px solid ${C.lineSoft}}
.tl-step:last-child{border:none}
.tl-n{font-family:${SERIF},serif;font-size:12pt;color:${C.gold}}
.tl-label{font-size:10pt;font-weight:600;color:${C.navy}}
.tl-body{font-size:9.5pt;color:${C.body};margin-top:2px;line-height:1.5}

.contra{margin:8px 0;padding-bottom:8px;border-bottom:1px solid ${C.lineSoft}}
.contra-poles{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-family:${SERIF},serif;font-size:11.5pt;color:${C.navy};margin-bottom:4px}
.contra-poles .sep{color:${C.gold}}
.shadow{display:grid;grid-template-columns:2.6rem 1fr;gap:6px;margin:10px 0}
.shadow .num{font-family:${SERIF},serif;font-size:16pt;color:${C.goldSoft};line-height:1}
.shadow h3{font-family:${SERIF},serif;font-size:11.5pt;color:${C.navy};margin-bottom:3px}

.play{margin:8px 0;padding:0 0 0 12px;border-left:2px solid ${C.goldDim}}
.play .n{font-size:7.5pt;color:${C.gold};margin-bottom:2px}
.portrait{font-family:${SERIF},serif;font-size:10.8pt;line-height:1.7;color:${C.body};margin:6px 0}
.closing{font-family:${SERIF},serif;font-size:12pt;line-height:1.5;color:${C.navy};margin-top:10px}
.why{margin-top:8px;padding-top:6px;border-top:1px solid ${C.lineSoft}}
.why .t{font-size:8pt;color:${C.gold};margin-bottom:3px}
.pattern{margin:7px 0;padding:6px 0;border-bottom:1px solid ${C.lineSoft}}
.pattern h3{font-family:${SERIF},serif;font-size:11pt;color:${C.navy};margin-bottom:3px}

/* Signature insight maps — informational, not decoration */
.imap{margin:10px 0 12px;border:1px solid ${C.lineSoft};background:${C.paper}}
.imap-head{padding:8px 12px;border-bottom:1px solid ${C.lineSoft};font-size:8pt;color:${C.gold};letter-spacing:0.04em}
.imap-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.imap-cell{padding:10px 12px;border-right:1px solid ${C.lineSoft};border-bottom:1px solid ${C.lineSoft}}
.imap-cell:nth-child(2n){border-right:none}
.imap-cell .lab{font-size:8pt;color:${C.gold};margin-bottom:4px}
.imap-cell .val{font-size:9.8pt;line-height:1.45;color:${C.ink}}
.imap-row{display:grid;grid-template-columns:5.5rem 1fr;gap:8px;padding:8px 12px;border-bottom:1px solid ${C.lineSoft};font-size:9.8pt}
.imap-row:last-child{border:none}
.imap-row .lab{color:${C.gold};font-weight:600}
.tempo{display:flex;align-items:stretch;gap:0;margin:10px 0}
.tempo-step{flex:1;text-align:center;padding:8px 4px;border-right:1px solid ${C.lineSoft};background:${C.paper}}
.tempo-step:last-child{border:none}
.tempo-step .n{font-size:7.5pt;color:${C.gold};margin-bottom:4px}
.tempo-step .t{font-family:${SERIF},serif;font-size:10pt;color:${C.navy};line-height:1.3}
.tempo-step .d{font-size:8pt;color:${C.warmGray};margin-top:4px;line-height:1.35}
.env-map{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:10px 0;border:1px solid ${C.lineSoft}}
.env-side{padding:12px}
.env-side.good{background:rgba(168,137,61,0.06);border-right:1px solid ${C.lineSoft}}
.env-side.hard{background:${C.paper}}
.env-side .h{font-family:${SERIF},serif;font-size:11pt;color:${C.navy};margin-bottom:6px}
.callout{margin:10px 0 0;padding:8px 12px;border-left:2px solid ${C.goldDim};background:rgba(168,137,61,0.05)}
.callout .t{font-size:7.5pt;color:${C.gold};letter-spacing:0.04em;margin-bottom:3px}
.callout .body{font-size:9.5pt;line-height:1.5;margin:0}
.ev-block{margin:10px 0 8px;padding:10px 12px;border:1px solid ${C.lineSoft};background:${C.paper}}
.ev-kicker{font-size:7.5pt;color:${C.gold};letter-spacing:0.04em;margin-bottom:6px}
.ev-signal,.ev-plain,.ev-link{font-size:9.5pt;line-height:1.5;color:${C.body};margin:4px 0}
.ev-block .lab{display:inline-block;min-width:7.2rem;color:${C.gold};font-weight:600;margin-right:6px}
`;
}
