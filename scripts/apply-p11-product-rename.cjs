/**
 * Apply P1.1 product rename via Supabase secret key (local or linked).
 * Usage: node --env-file=.env.local scripts/apply-p11-product-rename.cjs
 */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    console.error("MISSING supabase env");
    process.exit(2);
  }
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const updates = [
    {
      slug: "2026-total",
      patch: {
        name: "종합 사주 리포트",
        short_description: "성향·일·돈·관계를 하나의 리포트로",
        description:
          "타고난 성향과 결정 방식, 일·돈·관계에서 반복되는 패턴을 행동 중심으로 풀어 드립니다. 대운·세운 기반의 연도/월별 길흉 예언은 포함하지 않습니다.",
        sort_order: 1,
        status: "ACTIVE",
      },
    },
    {
      slug: "2026-money",
      patch: {
        short_description: "돈의 성향·새는 패턴·활용법을 깊게",
        description:
          "돈을 대하는 기본 성향, 벌고 새는 패턴, 판단이 흔들릴 때, 안정적으로 만드는 방식과 현실적인 행동 가이드를 집중 분석합니다. 특정 월·상하반기 길흉 타이밍 예언은 포함하지 않습니다.",
      },
    },
    {
      slug: "2026-career",
      patch: {
        short_description: "잘 맞는 업무·조직 환경 집중 분석",
        description:
          "일할 때의 캐릭터, 능력이 살아나는 업무, 답답해지는 조직, 갈등·과부하·인정 방식과 변화 신호를 행동 중심으로 분석합니다. 이직 월·승진 시기 예언은 포함하지 않습니다.",
      },
    },
    {
      slug: "2026-love",
      patch: {
        short_description: "끌림·갈등·거리의 행동 패턴 분석",
        description:
          "마음이 가는 방식, 관계가 깊어진 뒤의 패턴, 싸움과 거리, 잘 맞는 관계 방식을 실제 행동 중심으로 풀어 드립니다. 올해 인연·만남 시기 예언은 포함하지 않습니다.",
      },
    },
    {
      slug: "2027-total",
      patch: {
        status: "INACTIVE",
        name: "2027년 종합운세 (준비중)",
        short_description: "대운·세운 엔진 준비 후 오픈 예정",
        description:
          "연도/월별 운세는 대운·세운 데이터가 필요합니다. 현재 엔진에서는 제공하지 않아 판매를 일시 중지했습니다.",
      },
    },
  ];

  for (const u of updates) {
    const { error } = await admin.from("products").update(u.patch).eq("slug", u.slug);
    if (error) {
      console.error("FAIL", u.slug, error.message);
      process.exit(1);
    }
    console.log("OK", u.slug, u.patch.name || "(copy)");
  }

  await admin
    .from("prompt_definitions")
    .update({ name: "종합 사주 리포트" })
    .eq("slug", "2026-total");
  await admin
    .from("prompt_definitions")
    .update({ name: "2027 종합운세 (비활성)" })
    .eq("slug", "2027-total");

  const { data } = await admin
    .from("products")
    .select("slug, name, sale_price, status, short_description")
    .order("sort_order");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
