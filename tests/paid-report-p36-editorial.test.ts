import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  buildPaidReportPdfHtmlV5,
  findInternalCustomerTerms,
  findParticleErrors,
} from "@/lib/report/paid-report-pdf-v5";
import { sanitizeEditorialCopy, stripLabeledPrefix } from "@/lib/report/v5/easy-korean";

const chart = fortuneEngine.calculate({
  gender: "female",
  calendarType: "solar",
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  timezone: "Asia/Seoul",
  countryCode: "KR",
});
const ctx = buildFortuneAiContext(chart);
const v2 = buildInterpretationContextV2(ctx, chart);

function htmlFor(slug: string, name: string) {
  return buildPaidReportPdfHtmlV5({
    nickname: "수지",
    productName: name,
    productSlug: slug,
    report: buildMockPaidResult(ctx, name, { productSlug: slug, chart }),
    ctx,
    v2,
  });
}

function plain(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe("PHASE P3.6 easy value editorial cut", () => {
  it("removes axis jargon and broken connectors", () => {
    expect(sanitizeEditorialCopy("월간 십성 축은 보여줍니다")).toMatch(/월간에 나타난 십성/);
    expect(sanitizeEditorialCopy("함께 작용하는 구조를 함께 보면")).toBe("함께 보면");
    expect(sanitizeEditorialCopy("반대로 다만 스스로")).toMatch(/^다만/);
  });

  it("keeps Money free of internal axis terms and money-core pullQuote dup in moments", () => {
    const html = htmlFor("2026-money", "나의 돈 사용설명서");
    expect(html).not.toMatch(/월간 십성 축|오행 관계 축|년간 십성 축|오행 희소 축/);
    expect(html).not.toMatch(/반대로 반대로|반대로 다만/);
    expect(findInternalCustomerTerms(html)).toEqual([]);
    const moments = html.split('data-shot="profile"')[1]?.split("data-shot=")[0] ?? "";
    const pullHits = (moments.match(/큰돈은 막는데, 작은 반복은 늦게 보일 수 있다/g) ?? []).length;
    expect(pullHits).toBeLessThanOrEqual(1);
  });

  it("does not repeat career listen/later line across tangled and collab", () => {
    const html = htmlFor("2026-career", "나의 일 사용설명서");
    const hits = (html.match(/자리에서는 듣지만,\s*나중에 결론을 정리해 전달/g) ?? []).length;
    expect(hits).toBeLessThanOrEqual(1);
    expect(html).not.toMatch(/재현 가능한 품질/);
    expect(html).not.toMatch(/검수 지점/);
  });

  it("softens love over-specificity and fixes double 함께", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    expect(html).not.toMatch(/카톡이 느린/);
    expect(html).not.toMatch(/함께 작용하는 구조를 함께 보면/);
  });

  it("keeps Total page roles without shadow list on page 4", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const p4 = html.split('data-shot="unknown-patterns"')[1]?.split("data-shot=")[0] ?? "";
    expect(p4).toMatch(/헐, 나인데/);
    expect(p4).not.toMatch(/과해질 때 —/);
    const p9 = html.split('data-shot="contradiction"')[1]?.split("data-shot=")[0] ?? "";
    expect(p9).toMatch(/두 힘이 충돌|모순/);
    expect(p9).not.toMatch(/나는 왜 어떤 날은 빠르고/);
  });
});

describe("FINAL PRE-LIVE PROOFREAD", () => {
  it("fixes hard particle and connector errors", () => {
    expect(stripLabeledPrefix("반대로, 이미")).toBe("이미");
    expect(sanitizeEditorialCopy("金 기운이 두드러지고와 월간")).toMatch(/두드러지고,/);
    expect(sanitizeEditorialCopy("일간 庚경과 오행")).toMatch(/庚\(경\) 일간과/);
    expect(sanitizeEditorialCopy("상대에게는 상대는 이미")).toMatch(/상대에게는 이미/);
  });

  it("zeros proofread patterns across 4 reports", () => {
    const jobs = [
      ["2026-money", "나의 돈 사용설명서"],
      ["2026-career", "나의 일 사용설명서"],
      ["2026-love", "나의 연애 사용설명서"],
      ["2026-total", "나의 사주 사용설명서"],
    ] as const;
    for (const [slug, name] of jobs) {
      const html = htmlFor(slug, name);
      const text = plain(html);
      expect(text).not.toMatch(/두드러지고와/);
      expect(text).not.toMatch(/되고와/);
      expect(text).not.toMatch(/반대로\s+,/);
      expect(text).not.toMatch(/상대에게는\s*상대는/);
      expect(text).not.toMatch(/일간\s*庚경/);
      expect(text).not.toMatch(/일와의/);
      expect(text).not.toMatch(/점 배치를/);
      expect(text).not.toMatch(/두드러짐과\s*겁재/);
      expect(findParticleErrors(html)).toEqual([]);
    }
  });

  it("eases hard customer jargon in body copy", () => {
    const career = plain(htmlFor("2026-career", "나의 일 사용설명서"));
    const total = plain(htmlFor("2026-total", "나의 사주 사용설명서"));
    expect(career).not.toMatch(/재현성/);
    expect(career).not.toMatch(/전문성 누적형/);
    expect(career).not.toMatch(/검수형 경로/);
    expect(career).not.toMatch(/검수 포인트/);
    expect(career).not.toMatch(/강점이 비슷한 결과가 반복/);
    expect(total).not.toMatch(/서로 다른 축/);
    expect(total).not.toMatch(/재현성/);
    expect(total).not.toMatch(/검수 포인트/);
    expect(total).not.toMatch(/검수할 수 있는/);
  });

  it("keeps Love page 6 off page 3 primary themes", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    const p6 =
      html.split('data-shot="long-misread" data-layout="pair-compare"')[1]?.split(
        'data-shot="final"'
      )[0] ?? "";
    expect(p6).toMatch(/헐|오해|멀어|회복|오래|상대에게/);
    expect(p6).not.toMatch(/확신이 생기면 표현보다 실질적 챙김/);
    expect(p6).not.toMatch(/확신 후에는 말보다 행동이 갑자기/);
  });

  it("keeps Total page 6 off page 2 decision/stress cores", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const p6 = html.split('data-shot="situations"')[1]?.split("data-shot=")[0] ?? "";
    expect(p6).not.toMatch(/수집 단계와 확정 단계의 속도가 다른 구조/);
    expect(p6).not.toMatch(/정리가 끝나지 않은 상태’가 길어질 때 더 크게 쌓일/);
  });

  it("caps Love exact sentence and softens over-specific contact line", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    const text = plain(html);
    const dup =
      (text.match(
        /표현 과다보다 일관된 행동,\s*지나친 밀착보다 적절한 간격이 더 편할 수 있습니다/g
      ) ?? []).length;
    expect(dup).toBeLessThanOrEqual(1);
    expect(text).not.toMatch(/연락이 뜸한 날/);
  });

  it("removes Total page6/page8 work-core exact duplicate", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const p6 = html.split('data-shot="situations"')[1]?.split("data-shot=")[0] ?? "";
    const p8 = html.split('data-shot="domains"')[1]?.split("data-shot=")[0] ?? "";
    const needle = "완성도와 끝까지 결과를 맞추는 힘";
    const alt = "비슷한 수준의 결과를 꾸준히 내는 힘";
    const in6 = p6.includes(needle) || p6.includes(alt);
    const in8 = p8.includes(needle) || p8.includes(alt);
    expect(in6 && in8).toBe(false);
  });
});

describe("FINAL PDF DEDUPE SWEEP — actual output", () => {
  it("caps Love recovery sentence to <=1 and keeps it off page 4/7", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    const text = plain(html);
    const needle = /다시 가까워질 때는 사과의 크기보다/g;
    expect((text.match(needle) ?? []).length).toBeLessThanOrEqual(1);
    const p4 = html.split('data-shot="quiet-felt"')[1]?.split("data-shot=")[0] ?? "";
    const p7 = html.split('data-shot="final"')[1]?.split("data-shot=")[0] ?? "";
    expect(p4).not.toMatch(/다시 가까워질 때는 사과의 크기보다/);
    expect(p7).not.toMatch(/다시 가까워질 때는 사과의 크기보다/);
  });

  it("caps Total page2/page9 exact duplicates from generated HTML", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const text = plain(html);
    expect((text.match(/판단이 느린 게 아니라/g) ?? []).length).toBeLessThanOrEqual(1);
    expect((text.match(/상대는 이미 결론이 끝난 뒤/g) ?? []).length).toBeLessThanOrEqual(1);
    expect((text.match(/결정 지연이 기본값/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("softens Career evidence environment copy", () => {
    const html = htmlFor("2026-career", "나의 일 사용설명서");
    expect(html).toMatch(/정리하고 판단할 기준이 분명하고,\s*결과를 직접 확인할 수 있는 환경/);
    expect(html).not.toMatch(/정리·판단·결과 확인 쪽 기준을 세우고 결과를 확인할 수 있는 환경/);
  });

  it("limits Money 인색 near-duplicates in people section", () => {
    const html = htmlFor("2026-money", "나의 돈 사용설명서");
    const people = html.split('data-shot="income-people"')[1]?.split("data-shot=")[0] ?? "";
    const hits = (plain(people).match(/인색/g) ?? []).length;
    expect(hits).toBeLessThanOrEqual(1);
  });
});

describe("FINAL TEASER LANGUAGE HOTFIX", () => {
  it("bans mechanical 때가 있다 / 편이다 morph on Career overview", () => {
    const html = htmlFor("2026-career", "나의 일 사용설명서");
    const p2 = html.split('data-shot="environment"')[1]?.split("data-shot=")[0] ?? "";
    const text = plain(p2);
    expect(text).not.toMatch(/사람일 때가 있다/);
    expect(text).not.toMatch(/타입이?ㄹ? 때가 있다/);
    expect(text).not.toMatch(/때가 있다/);
    expect(text).not.toMatch(/편이다/);
    expect(text).toMatch(/끝이 보일수록 힘이 붙는 편|완료 조건을 함께 정해/);
  });

  it("bans mechanical 때가 있다 repetition on Love page 2", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    const p2 = html.split('data-shot="before-after"')[1]?.split("data-shot=")[0] ?? "";
    const text = plain(p2);
    expect(text).not.toMatch(/사람일 때가 있다/);
    expect(text).not.toMatch(/타입일 때가 있다/);
    expect(text).not.toMatch(/때가 있다/);
    expect(text).not.toMatch(/편이다/);
    expect(text).toMatch(/확신 전에는 속도를 조절하는 편|태도의 일관성을 오래 살핌/);
  });

  it("keeps Money page 2 teasers with clear subjects", () => {
    const html = htmlFor("2026-money", "나의 돈 사용설명서");
    const p2 = html.split('data-shot="profile"')[1]?.split("data-shot=")[0] ?? "";
    const text = plain(p2);
    expect(text).not.toMatch(/쓰는 데서 보는 기준이 다를 때가 있다/);
    expect(text).not.toMatch(/한 달 뒤엔 큰 구멍으로 보일 때가 있다/);
    expect(text).not.toMatch(/때가 있다/);
    expect(text).toMatch(/벌 때와 쓸 때|작은 반복 지출|찜찜함/);
  });

  it("keeps Total page 4 discovery teasers with clear subjects", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const p4 = html.split('data-shot="unknown-patterns"')[1]?.split("data-shot=")[0] ?? "";
    const text = plain(p4);
    expect(text).not.toMatch(/흐름인가가 더 중요할 때가 있다/);
    expect(text).not.toMatch(/마음을 정하기 전의 속도가 다를 때가 있다/);
    expect(text).not.toMatch(/더 쌓일 때가 있다/);
    expect(text).not.toMatch(/때가 있다/);
    expect(text).toMatch(/돈에서는|연애에서는|스트레스가 쌓임|겉으로 맞추는 동안/);
  });
});
