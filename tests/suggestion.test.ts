import { describe, expect, it } from "vitest";
import { countNumberedItems, parseDocument } from "../lib/parse/parseDocument";

describe("번호 목록을 세어 건수 제안하기", () => {
  it("1부터 차례로 이어지는 숫자 줄 묶음 하나를 센다", () => {
    expect(countNumberedItems(["No.", "1", "업체", "2", "업체", "3"])).toBe(3);
    expect(countNumberedItems(["표", "글자", "1"])).toBe(1);
  });

  it("번호가 없거나 목록이 둘 이상이면 제안하지 않는다", () => {
    expect(countNumberedItems(["글자만", "있어요"])).toBeNull();
    expect(countNumberedItems(["1", "2", "표", "1", "2", "3"])).toBeNull();
  });

  it("1로 시작하지 않는 숫자(날짜, 쪽번호 등)는 목록으로 보지 않는다", () => {
    expect(countNumberedItems(["5", "12", "2026"])).toBeNull();
  });

  it("지정취소 문서에 건수 문구가 없으면 번호 목록을 세어 제안하고, 칸에는 넣지 않는다", () => {
    const lines = ["[산업통상부]", "혁신제품 지정취소(안)", "No.", "1", "업체 가", "2", "업체 나"];
    const [result] = parseDocument("취소.hwpx", lines);
    expect(result).toMatchObject({ ministry: "산업부", category: "지정취소", count: { kind: "empty" } });
    expect(result.problem).toContain("찾지 못했어요");
    expect(result.suggestion?.value).toBe(2);
  });

  it("연장 문서에 인정 건수 문구가 없으면 '인정 대상 세부 현황'의 번호 목록만 센다", () => {
    const lines = [
      "[해양수산부]혁신제품 지정 2차 연장 검토",
      "세부 접수현황",
      "1", "접수 가", "2", "접수 나", "3", "접수 다",
      "2. 혁신제품 지정 2차 연장 인정",
      "인정 대상 세부 현황",
      "1", "인정 가", "2", "인정 나",
      "3. 혁신제품 지정 2차 연장 미인정",
      "1", "미인정 가",
    ];
    const [result] = parseDocument("연장.hwpx", lines);
    expect(result).toMatchObject({ category: "2차연장", count: { kind: "empty" } });
    expect(result.suggestion?.value).toBe(2); // 접수(3)나 미인정(1)이 아니라 인정 목록(2)
  });

  it("건수를 읽은 문서에는 제안을 붙이지 않는다", () => {
    const lines = ["[해양수산부]", "혁신제품 지정취소(안)", "지정취소 2건", "1", "2"];
    const [result] = parseDocument("취소.hwpx", lines);
    expect(result.count).toEqual({ kind: "number", value: 2 });
    expect(result.suggestion).toBeUndefined();
  });
});
