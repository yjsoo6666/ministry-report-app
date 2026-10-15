import { describe, expect, it } from "vitest";
import { roundLabels } from "../lib/table/roundLabels";

describe("조달심 차수 이름", () => {
  it("4를 적으면 이번은 4차, 지난은 3차다", () => {
    expect(roundLabels("4")).toEqual({ current: "4차", previous: "3차", named: true });
    expect(roundLabels(" 12 ")).toEqual({ current: "12차", previous: "11차", named: true });
  });

  it("비었거나 1 이하이거나 숫자가 아니면 이번 차수/지난 차수로 쓴다", () => {
    for (const input of ["", "0", "1", "abc", "4차", "-3", "100"]) {
      expect(roundLabels(input), input).toEqual({ current: "이번 차수", previous: "지난 차수", named: false });
    }
  });
});
