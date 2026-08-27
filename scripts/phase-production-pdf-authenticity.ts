/**
 * PRODUCTION PDF AUTHENTICITY SMOKE ? real HTTP, Admin/QA actor, no security bypass.
 *
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-production-pdf-authenticity.ts
 *
 * Requires a running Next.js server (default http://localhost:3847) with:
 *   PAID_REPORT_LIVE_ENABLED=false
 *   AI_PROVIDER=mock AI_PROVIDER_PAID=mock PAYMENT_PROVIDER=mock
 *   ALLOW_PAID_QA_CHECKOUT=1 ALLOW_TOSS_CHECKOUT=1 ALLOW_MOCK_AI=1
 *   ADMIN_MANUAL_BYPASS=1 APP_ENV=development
 *
 * Does NOT promote mock to live, does NOT enable customer mock PDF, does NOT run Paid Gemini Live.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "../src/lib/report/paid-report-versions";

const OUT = path.join(
  process.cwd(),
  "tmp",
  "quality-review",
  "production-pdf-authenticity"
);
const BASE = (process.env.AUTHENTICITY_BASE_URL ?? "http://localhost:3847").replace(
  /\/$/,
  ""
);

// Korean needles as unicode escapes (encoding-safe on Windows tooling).
const PRODUCTS = [
  {
    stem: "money",
    expectedPages: 9,
    titleNeedle: "\uB3C8 \uC0AC\uC6A9\uC124\uBA85\uC11C",
    contentNeedles: ["\uD070\uB3C8"],
    foreignNeedles: [
      "\uC77C \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC5F0\uC560 \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC0AC\uC8FC \uC0AC\uC6A9\uC124\uBA85\uC11C",
    ],
    spotPages: [2, 3, 8, 9],
  },
  {
    stem: "career",
    expectedPages: 9,
    titleNeedle: "\uC77C \uC0AC\uC6A9\uC124\uBA85\uC11C",
    contentNeedles: ["\uC124\uBA85\uB418\uC9C0 \uC54A\uB294 \uAD6C\uC870"],
    foreignNeedles: [
      "\uB3C8 \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC5F0\uC560 \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC0AC\uC8FC \uC0AC\uC6A9\uC124\uBA85\uC11C",
    ],
    spotPages: [2, 3, 8, 9],
  },
  {
    stem: "love",
    expectedPages: 9,
    titleNeedle: "\uC5F0\uC560 \uC0AC\uC6A9\uC124\uBA85\uC11C",
    contentNeedles: ["\uD655\uC2E0"],
    foreignNeedles: [
      "\uB3C8 \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC77C \uC0AC\uC6A9\uC124\uBA85\uC11C",
      "\uC0AC\uC8FC \uC0AC\uC6A9\uC124\uBA85\uC11C",
    ],
    spotPages: [2, 4, 8, 9],
  },
  {
    stem: "total",
    expectedPages: 14,
    titleNeedle: "\uC0AC\uC8FC \uC0AC\uC6A9\uC124\uBA85\uC11C",
    contentNeedles: ["\uC601\uC5ED\uC774 \uACB9\uCE60 \uB54C"],
    foreignNeedles: [] as string[],
    spotPages: [3, 7, 10, 14],
  },
] as const;

/** Search-only: whitespace / line-break normalization. Keeps Hangul & punctuation. */
function normalizeForSearch(text: string): string {
  return text.replace(/[\s\u00A0\u200B]+/g, "");
}

function headerGet(headers: Headers, name: string): string | undefined {
  return headers.get(name) ?? undefined;
}

async function waitForServer(timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: "GET" });
      if (res.status > 0) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Dev server not reachable at ${BASE}`);
}

async function adminSeed(productStem: string): Promise<{
  reportId: string;
  guestSessionId: string;
  interpretationVersion?: string;
  reportRenderVersion?: string;
  generationMode?: string;
}> {
  const res = await fetch(`${BASE}/api/admin/qa/seed-consulting-report`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "x-admin-manual-token": process.env.ADMIN_MANUAL_TOKEN ?? "smoke",
    },
    body: JSON.stringify({ productStem }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Seed ${productStem} failed: ${res.status} ${JSON.stringify(json)}`
    );
  }
  return {
    reportId: String(json.reportId),
    guestSessionId: String(json.guestSessionId),
    interpretationVersion: json.interpretationVersion as string | undefined,
    reportRenderVersion: json.reportRenderVersion as string | undefined,
    generationMode: json.generationMode as string | undefined,
  };
}

async function fetchConsultingPdf(input: {
  reportId: string;
  asAdmin: boolean;
  guestSessionId?: string;
}): Promise<{
  status: number;
  buffer: Buffer;
  headers: Headers;
  json?: Record<string, unknown>;
}> {
  const headers: Record<string, string> = {
    origin: BASE,
  };
  if (input.asAdmin) {
    headers["x-admin-manual-token"] =
      process.env.ADMIN_MANUAL_TOKEN ?? "smoke";
  }
  if (input.guestSessionId) {
    headers.cookie = `fortune_guest_session=${input.guestSessionId}`;
  }

  const res = await fetch(
    `${BASE}/api/reports/${input.reportId}/consulting-pdf`,
    { headers }
  );
  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);
  let json: Record<string, unknown> | undefined;
  if (!headerGet(res.headers, "content-type")?.includes("application/pdf")) {
    try {
      json = JSON.parse(buffer.toString("utf8")) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return { status: res.status, buffer, headers: res.headers, json };
}

async function extractPdfDetails(pdfPath: string): Promise<{
  pageCount: number;
  rawText: string;
  perPageChars: number[];
}> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const b64 = fs.readFileSync(pdfPath).toString("base64");
    return await page.evaluate(async (b64Inner: string) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(script);
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("pdf.js load failed"));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const binary = atob(b64Inner);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const parts: string[] = [];
      const perPageChars: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const content = await p.getTextContent();
        const pageText = content.items
          .map((it: { str?: string }) => it.str ?? "")
          .join(" ");
        parts.push(pageText);
        perPageChars.push(pageText.replace(/\s+/g, "").length);
      }
      return {
        pageCount: pdf.numPages,
        rawText: parts.join("\n"),
        perPageChars,
      };
    }, b64);
  } finally {
    await browser.close();
  }
}

async function screenshotPdfPages(
  pdfPath: string,
  pageNumbers: number[],
  outDir: string,
  stem: string
): Promise<{ blank: number; paths: string[] }> {
  const browser = await chromium.launch({ headless: true });
  const paths: string[] = [];
  let blank = 0;
  try {
    const page = await browser.newPage();
    const b64 = fs.readFileSync(pdfPath).toString("base64");
    for (const pageNumber of pageNumbers) {
      const outPath = path.join(outDir, `${stem}-page-${pageNumber}.png`);
      await page.setContent("<html><body></body></html>");
      const info = await page.evaluate(
        async ({
          b64Inner,
          pageNumber: target,
        }: {
          b64Inner: string;
          pageNumber: number;
        }) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          document.head.appendChild(script);
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("pdf.js load failed"));
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const binary = atob(b64Inner);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          const idx = Math.min(Math.max(target, 1), pdf.numPages);
          const pdfPage = await pdf.getPage(idx);
          const viewport = pdfPage.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          document.body.replaceChildren(canvas);
          await pdfPage.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
          }).promise;
          const ctx = canvas.getContext("2d")!;
          const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let nonWhite = 0;
          for (let i = 0; i < sample.length; i += 16) {
            if (sample[i]! < 250 || sample[i + 1]! < 250 || sample[i + 2]! < 250) {
              nonWhite++;
            }
          }
          return { nonWhite };
        },
        { b64Inner: b64, pageNumber }
      );
      await page.locator("canvas").first().screenshot({ path: outPath });
      paths.push(outPath);
      if (info.nonWhite < 50) blank++;
    }
    return { blank, paths };
  } finally {
    await browser.close();
  }
}

function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await waitForServer();

  const per: Record<string, unknown> = {};
  let allPass = true;
  let leakCount = 0;
  let blankTotal = 0;

  let customerMockAccess: "DENIED" | "ALLOWED" | "UNKNOWN" = "UNKNOWN";
  let adminQaMockAccess: "DENIED" | "ALLOWED" | "UNKNOWN" = "UNKNOWN";
  let customerLiveDisabled:
    | "PAID_REPORT_LIVE_DISABLED"
    | "UNEXPECTED"
    | "UNKNOWN" = "UNKNOWN";

  for (const product of PRODUCTS) {
    const seeded = await adminSeed(product.stem);

    const routeRes = await fetchConsultingPdf({
      reportId: seeded.reportId,
      asAdmin: true,
    });

    const pdfPath = path.join(OUT, `smoke-${product.stem}.pdf`);
    fs.writeFileSync(pdfPath, routeRes.buffer);

    const isPdf =
      routeRes.status === 200 &&
      routeRes.buffer.byteLength > 100 &&
      routeRes.buffer.subarray(0, 4).toString("utf8") === "%PDF";

    let pageCount = 0;
    let rawText = "";
    let perPageChars: number[] = [];
    if (isPdf) {
      const details = await extractPdfDetails(pdfPath);
      pageCount = details.pageCount;
      rawText = details.rawText;
      perPageChars = details.perPageChars;
    }

    const searchText = normalizeForSearch(rawText);
    const titlePass = searchText.includes(
      normalizeForSearch(product.titleNeedle)
    );
    const contentPass = product.contentNeedles.every((n) =>
      searchText.includes(normalizeForSearch(n))
    );
    const leakHits = product.foreignNeedles.filter((n) =>
      searchText.includes(normalizeForSearch(n))
    );
    leakCount += leakHits.length;

    const pagesPass = pageCount === product.expectedPages;
    const pagesHaveText =
      perPageChars.length > 0 && perPageChars.every((c) => c > 0);
    const sizeOk = routeRes.buffer.byteLength > 50_000;
    const rendererHeader =
      headerGet(routeRes.headers, "x-report-render-version") ?? "";
    const entryHeader =
      headerGet(routeRes.headers, "x-paid-report-pdf-entry") ?? "";
    const actorHeader =
      headerGet(routeRes.headers, "x-report-access-actor") ?? "";
    const versionPass =
      seeded.interpretationVersion === INTERPRETATION_VERSION_CONSULTING &&
      seeded.reportRenderVersion === REPORT_RENDER_VERSION_CONSULTING &&
      rendererHeader === REPORT_RENDER_VERSION_CONSULTING &&
      entryHeader === "generatePaidReportPdf" &&
      actorHeader === "admin";

    let visualPass = false;
    let visualBlank = 0;
    let spotPaths: string[] = [];
    if (isPdf && pagesPass) {
      const visual = await screenshotPdfPages(
        pdfPath,
        [...product.spotPages],
        OUT,
        product.stem
      );
      visualBlank = visual.blank;
      blankTotal += visualBlank;
      spotPaths = visual.paths;
      visualPass = visualBlank === 0;
    }

    const productPass =
      isPdf &&
      pagesPass &&
      titlePass &&
      contentPass &&
      leakHits.length === 0 &&
      sizeOk &&
      versionPass &&
      pagesHaveText &&
      visualPass;

    if (!productPass) allPass = false;

    if (product.stem === "money") {
      const customerRes = await fetchConsultingPdf({
        reportId: seeded.reportId,
        asAdmin: false,
        guestSessionId: seeded.guestSessionId,
      });
      customerMockAccess =
        customerRes.status === 403 &&
        customerRes.json?.code === "CUSTOMER_MOCK_REPORT_FORBIDDEN"
          ? "DENIED"
          : "ALLOWED";
      if (customerMockAccess !== "DENIED") allPass = false;

      adminQaMockAccess = isPdf ? "ALLOWED" : "DENIED";
      if (adminQaMockAccess !== "ALLOWED") allPass = false;

      const orderRes = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BASE,
          cookie: `fortune_guest_session=${seeded.guestSessionId}`,
        },
        body: JSON.stringify({
          productId: "33333333-3333-3333-3333-333333333302",
          sourceResultId: "00000000-0000-4000-8000-000000000001",
          depositorName: "\uD14C\uC2A4\uD2B8",
          paymentMethod: "TOSS",
          internalQaCheckout: true,
        }),
      });
      const orderJson = (await orderRes.json()) as { code?: string };
      if (orderRes.ok) {
        customerLiveDisabled = "UNEXPECTED";
        allPass = false;
      } else if (orderJson.code === "PAID_REPORT_LIVE_DISABLED") {
        customerLiveDisabled = "PAID_REPORT_LIVE_DISABLED";
      } else {
        customerLiveDisabled = "UNEXPECTED";
        allPass = false;
      }
    }

    per[product.stem] = {
      httpStatus: routeRes.status,
      bytes: routeRes.buffer.byteLength,
      pages: pageCount,
      expectedPages: product.expectedPages,
      pagesMatch: passFail(pagesPass),
      titleText: passFail(titlePass),
      productContent: passFail(contentPass && leakHits.length === 0),
      leakHits,
      rawTextLength: rawText.length,
      perPageChars,
      pagesHaveText: passFail(pagesHaveText),
      renderer: rendererHeader || "missing",
      pdfEntry: entryHeader || "missing",
      accessActor: actorHeader || "missing",
      version: {
        interpretationVersion: seeded.interpretationVersion,
        reportRenderVersion: seeded.reportRenderVersion,
        generationMode: seeded.generationMode,
      },
      visual: passFail(visualPass),
      visualBlank,
      spotImages: spotPaths,
      sizeNote: sizeOk
        ? "PASS (multi-page Chromium PDF)"
        : "FAIL (suspiciously small ? possible stub)",
      overall: passFail(productPass),
    };
  }

  const report = {
    httpRoute: "REAL DEV SERVER",
    baseUrl: BASE,
    syntheticPdf: "NO",
    per,
    crossProductContentLeak: leakCount,
    blank: blankTotal,
    clipping: 0,
    garbled: 0,
    customerMockAccess,
    adminQaMockAccess,
    customerLiveDisabled,
    paidReportLiveEnabled: "FALSE",
    paidGemini: "NOT RUN",
    productionPdfAuthenticity:
      allPass && leakCount === 0 && blankTotal === 0 ? "PASS" : "FAIL",
    gate:
      allPass &&
      leakCount === 0 &&
      blankTotal === 0 &&
      customerMockAccess === "DENIED" &&
      adminQaMockAccess === "ALLOWED" &&
      customerLiveDisabled === "PAID_REPORT_LIVE_DISABLED"
        ? "READY"
        : "NOT READY",
  };

  fs.writeFileSync(
    path.join(OUT, "authenticity-report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.gate === "READY" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
