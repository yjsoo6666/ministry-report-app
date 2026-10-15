import { describe, expect, it } from "vitest";
import { parseDocument } from "../lib/parse/parseDocument";

const num = (value: number) => ({ kind: "number" as const, value });
const EMPTY = { kind: "empty" as const };

// 지정취소 문서는 아직 사진이 없어서, "지정취소 몇 건"이 명시돼 있다는 설명을 바탕으로 만든 시험이다.
describe("parseDocument: 지정취소 문서", () => {
  const title = "[산림청]혁신제품 지정취소 검토";

  it.each([
    ["지정취소 3건", 3],
    ["지정 취소 3건", 3],
    ["〈지정취소〉 3개", 3],
    ["지정취소 대상 요약(3건)", 3],
    ["지정취소 현황: 3건", 3],
    ["지정취소 약 3건", 3],
  ])("'%s' 에서 건수 %i을 읽는다", (phrase, expected) => {
    const [result, ...rest] = parseDocument("취소.hwpx", [title, phrase]);
    expect(rest).toEqual([]);
    expect(result.ministry).toBe("산림청");
    expect(result.category).toBe("지정취소");
    expect(result.count).toEqual(num(expected));
    expect(result.problem).toBeUndefined();
  });

  it("지정취소가 '-건'이면 빈칸이고 문제로 알리지 않는다", () => {
    const [result] = parseDocument("취소.hwpx", [title, "지정취소 -건"]);
    expect(result.category).toBe("지정취소");
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toBeUndefined();
  });

  it("제목에는 지정취소가 있는데 건수 문구가 없으면 빈칸으로 두고 이유를 남긴다", () => {
    const [result] = parseDocument("취소.hwpx", [title, "아래와 같이 검토하였음"]);
    expect(result.category).toBe("지정취소");
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toContain("지정취소");
  });

  it("지정취소가 제목이 아닌 곳에만 언급되고 건수 문구가 없으면 지정취소 문서로 보지 않는다", () => {
    const lines = [
      "[산림청]혁신제품 검토",
      "검토 기간: 26. 5. 12. ~ 26. 6. 10.",
      "아래와 같이 검토하였음",
      "참고: 지정취소 사유가 있으면 별도 보고",
    ];
    const [result] = parseDocument("기타.hwpx", lines);
    expect(result.category).toBeNull();
  });

  it("2차 연장 문서 안에 지정취소 문구가 있어도 연장 문서로만 읽는다", () => {
    const lines = [
      "[산림청]혁신제품 지정 2차 연장 검토",
      "인정 대상 요약(2개)",
      "지정취소 5건",
    ];
    const results = parseDocument("연장.hwpx", lines);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("2차연장");
    expect(results[0].count).toEqual(num(2));
  });
});

describe("단위 '건'도 '개'와 같은 건수로 읽는다", () => {
  it("연장 문서: 인정 대상 요약(1건)", () => {
    const [result] = parseDocument("연장.hwpx", [
      "[해양수산부]혁신제품 지정 2차 연장 검토",
      "접수 현황(5건)",
      "인정 대상 요약(1건)",
    ]);
    expect(result.count).toEqual(num(1));
  });

  it("신규지정 문서: 〈신규지정〉 2건", () => {
    const [result] = parseDocument("신규.hwpx", ["해양수산부", "유형 | 〈신규지정〉 2건"]);
    expect(result.category).toBe("신규지정");
    expect(result.count).toEqual(num(2));
  });
});
