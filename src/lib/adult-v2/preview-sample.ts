/**
 * Development-only editorial sample for the V2 preview route.
 * It is intentionally not calculated from a customer chart and must never be
 * persisted, sent to AI, or used as a paid-report result.
 */
export const ADULT_V2_PREVIEW_SAMPLE = {
  subject: "김결",
  year: 2026,
  subtitle: "현재의 선택을 더 또렷하게 바라보는 인생 지도",
  coreWords: ["흐름을 읽는 사람", "기준을 세우는 사람", "조용히 완성하는 사람"],
  themes: [
    { label: "자원과 선택", level: "높음", width: "76%" },
    { label: "역할과 책임", level: "보통", width: "52%" },
    { label: "배움과 회복", level: "높음", width: "68%" },
    { label: "표현과 실행", level: "보통", width: "49%" },
  ],
  years: [
    { year: "2026", theme: "기준을 세우는 해", emphasis: "현재" },
    { year: "2027", theme: "관계를 조율하는 해", emphasis: "" },
    { year: "2028", theme: "표현을 넓히는 해", emphasis: "" },
    { year: "2029", theme: "자원을 정리하는 해", emphasis: "" },
    { year: "2030", theme: "방향을 다시 고르는 해", emphasis: "" },
  ],
} as const;
