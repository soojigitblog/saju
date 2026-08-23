import { describe, expect, it } from "vitest";
import {
  bindHookLinePhrases,
  splitHookLineForDisplay,
} from "@/lib/text/hook-line-display";

describe("hook line display", () => {
  it("breaks after comma for two-beat hooks", () => {
    const hook =
      "웬만한 일엔 웃어넘기다가, 내 선 건드리면 말이 짧아지는 사람";
    const segments = splitHookLineForDisplay(hook);
    expect(segments).toEqual([
      { kind: "text", value: "웬만한 일엔 웃어넘기다가," },
      { kind: "break" },
      {
        kind: "text",
        value: "내\u00A0선 건드리면 말이\u00A0짧아지는 사람",
      },
    ]);
  });

  it("binds 내 선 without comma", () => {
    expect(bindHookLinePhrases("내 선 건드리면")).toBe(
      "내\u00A0선 건드리면"
    );
  });

  it("returns single segment when no comma", () => {
    expect(splitHookLineForDisplay("귀찮다고 말하면서도 끝까지 하는 사람")).toEqual([
      { kind: "text", value: "귀찮다고 말하면서도 끝까지 하는 사람" },
    ]);
  });
});
