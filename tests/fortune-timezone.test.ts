import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("server timezone regression", () => {
  it("UTC / Asia/Seoul / America/New_York produce identical pillars", () => {
    const script = path.join(process.cwd(), "scripts/check-tz-determinism.cjs");
    const zones = ["UTC", "Asia/Seoul", "America/New_York"];
    const outputs = zones.map((tz) => {
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
      });
      expect(result.status, result.stderr).toBe(0);
      return JSON.parse(result.stdout);
    });

    expect(outputs[0]).toEqual(outputs[1]);
    expect(outputs[1]).toEqual(outputs[2]);
    expect(outputs[0]).toEqual({
      year: { korean: "임신", hanja: "壬申" },
      month: { korean: "경술", hanja: "庚戌" },
      day: { korean: "계유", hanja: "癸酉" },
      hour: { korean: "을묘", hanja: "乙卯" },
    });
  });

  it("explicit +09:00 Date ms is independent of process TZ", () => {
    const iso = "1992-10-24T05:30:00+09:00";
    const zones = ["UTC", "Asia/Seoul", "America/New_York"];
    const times = zones.map((tz) => {
      const prev = process.env.TZ;
      process.env.TZ = tz;
      const ms = new Date(iso).getTime();
      process.env.TZ = prev;
      return ms;
    });
    expect(new Set(times).size).toBe(1);
  });
});
