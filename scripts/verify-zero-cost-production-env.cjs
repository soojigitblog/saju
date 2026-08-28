/**
 * P7 deployment runtime env — never trusts .env.local alone.
 *
 * Mode A (on-host): DEPLOYMENT_ENV_CHECK=1
 * Mode B (remote):  PRODUCTION_ORIGIN=https://your-domain
 */
function flag(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

function isTrue(name) {
  const v = flag(name).toLowerCase();
  return v === "true" || v === "1";
}

async function checkRemote(origin) {
  const url = `${origin.replace(/\/$/, "")}/api/ops/launch-policy`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    console.error(`launch-policy HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

async function main() {
  const origin = flag("PRODUCTION_ORIGIN");
  const onHost = process.env.DEPLOYMENT_ENV_CHECK === "1";

  console.log("## P7 Production Environment Check\n");

  if (!onHost && !origin) {
    console.error(
      "FAIL: set DEPLOYMENT_ENV_CHECK=1 on deployment host OR PRODUCTION_ORIGIN for remote probe."
    );
    console.error(".env.local alone is not accepted for PASS.");
    process.exit(1);
  }

  if (onHost) {
    const checkout = isTrue("PAID_CHECKOUT_ENABLED");
    const generation = isTrue("PAID_REPORT_GENERATION_ENABLED");
    const paidKey = Boolean(flag("GEMINI_API_KEY_PAID"));
    console.log(`Source: deployment process.env`);
    console.log(`PAID_CHECKOUT_ENABLED: ${checkout ? "true" : flag("PAID_CHECKOUT_ENABLED") || "false/unset"}`);
    console.log(`PAID_REPORT_GENERATION_ENABLED: ${generation ? "true" : flag("PAID_REPORT_GENERATION_ENABLED") || "false/unset"}`);
    console.log(`GEMINI_API_KEY_PAID: ${paidKey ? "CONFIGURED" : "NOT CONFIGURED"}`);
    const ok = checkout && !generation && !paidKey;
    console.log(`\nRESULT: ${ok ? "PASS" : "FAIL"}`);
    process.exit(ok ? 0 : 1);
  }

  console.log(`Source: remote ${origin}`);
  const policy = await checkRemote(origin);
  if (!policy) {
    console.log("\nRESULT: FAIL — could not read launch-policy");
    process.exit(1);
  }

  console.log(`paidCheckoutEnabled: ${policy.paidCheckoutEnabled}`);
  console.log(`paidGenerationEnabled: ${policy.paidGenerationEnabled}`);
  console.log(`paidGeminiKeyConfigured: ${policy.paidGeminiKeyConfigured}`);
  console.log(`zeroCostLaunch: ${policy.zeroCostLaunch}`);

  const ok =
    policy.paidCheckoutEnabled === true &&
    policy.paidGenerationEnabled === false &&
    policy.paidGeminiKeyConfigured === false &&
    policy.zeroCostLaunch === true;

  console.log(`\nRESULT: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
