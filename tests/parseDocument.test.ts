import { describe, expect, it } from "vitest";
import { parseDocument } from "../lib/parse/parseDocument";

const num = (value: number) => ({ kind: "number" as const, value });
const EMPTY = { kind: "empty" as const };

// 사진 속 "2차 연장 검토 결과" 문서의 글자를 흉내 낸 줄 목록 (숫자만 바꿔 가며 쓴다)
function secondExtension(receipt: string, approved: string, notApproved = "-"): string[] {
  return [
    "[해양수산부]혁신제품 지정 2차 연장 검토",
    "1. 혁신제품 지정 2차 연장 접수 현황",
    "신청접수 기간 : `26. 5. 12. ~ `26. 6. 10.",
    `접수 현황(${receipt}개)`,
    "2. 혁신제품 지정 2차 연장 인정",
    `인정 대상 요약(${approved}개)`,
    "3. 혁신제품 지정 2차 연장 미인정",
    `미인정 대상 요약(${notApproved}개)`,
    "4. 혁신제품 지정 2차 연장 합동평가 논의 필요",
    "논의 필요 대상 요약(-개)",
  ];
}

describe("parseDocument: 2차 연장 문서", () => {
  it("사진 속 문서처럼 인정 1개면 해수부 2차연장 1을 읽는다", () => {
    const [result, ...rest] = parseDocument("연장.hwpx", secondExtension("1", "1"));
    expect(rest).toEqual([]);
    expect(result.ministry).toBe("해수부");
    expect(result.category).toBe("2차연장");
    expect(result.count).toEqual(num(1));
    expect(result.problem).toBeUndefined();
  });

  it("접수 건수는 무시하고 인정 건수만 센다", () => {
    const [result] = parseDocument("연장.hwpx", secondExtension("5", "2", "3"));
    expect(result.count).toEqual(num(2));
  });

  it("미인정 요약은 인정으로 세지 않는다", () => {
    const lines = ["[해양수산부]혁신제품 지정 2차 연장 검토", "미인정 대상 요약(3개)"];
    const [result] = parseDocument("연장.hwpx", lines);
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toContain("인정 대상 요약");
  });

  it("인정이 '-'이면 빈칸이고 문제로 알리지 않는다", () => {
    const [result] = parseDocument("연장.hwpx", secondExtension("2", "-", "2"));
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toBeUndefined();
  });

  it("인정 건수 칸이 비어 있어도 빈칸이다", () => {
    const [result] = parseDocument("연장.hwpx", secondExtension("2", ""));
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toBeUndefined();
  });

  it("인정 요약 문구가 아예 없으면 빈칸이고 이유를 남긴다", () => {
    const lines = ["[해양수산부]혁신제품 지정 2차 연장 검토", "접수 현황(2개)"];
    const [result] = parseDocument("연장.hwpx", lines);
    expect(result.count).toEqual(EMPTY);
    expect(result.problem).toContain("찾지 못했어요");
  });

  it.each([
    ["약1", 1],
    ["약 1", 1],
    ["총 3", 3],
    ["약12", 12],
  ])("숫자 앞에 '약', '총' 같은 한글이 붙어 있어도 그 숫자로 읽는다: %s", (text, expected) => {
    const [result] = parseDocument("연장.hwpx", secondExtension("2", text));
    expect(result.count).toEqual(num(expected));
    expect(result.problem).toBeUndefined();
  });

  it.each(["1~2", "1/2", "여러", "?", "1 2"])(
    "숫자 하나로 정할 수 없는 글자(%s)는 확인 필요로 읽는다",
    (text) => {
      const [result] = parseDocument("연장.hwpx", secondExtension("2", text));
      expect(result.count).toEqual({ kind: "check" });
    },
  );

  it("신규지정에서도 숫자 앞의 '약'을 넘겨서 읽는다", () => {
    const [result] = parseDocument("신규.hwpx", ["해양수산부", "유형 | 〈신규지정〉 약 2개"]);
    expect(result.count).toEqual(num(2));
  });

  it("제목에 1차 연장이 적혀 있으면 1차연장으로 읽는다", () => {
    const lines = secondExtension("3", "3").map((l) => l.replace(/2차/g, "1차"));
    const [result] = parseDocument("연장.hwpx", lines);
    expect(result.category).toBe("1차연장");
    expect(result.count).toEqual(num(3));
  });

  it("부처명을 줄임말로 바꾼다", () => {
    const lines = secondExtension("1", "1");
    lines[0] = "[행정안전부]혁신제품 지정 2차 연장 검토";
    expect(parseDocument("연장.hwpx", lines)[0].ministry).toBe("행안부");
  });
});

describe("parseDocument: 신규지정 문서", () => {
  const newDesignation = (extra: string[] = []) => [
    "해양수산부",
    "유형 | 〈신규지정〉 1개",
    "No. 부처 사진 업체명 혁신명 공공문제 기대효과",
    ...extra,
  ];

  it("제목이 부처 이름뿐이어도 부처명을 읽고 신규지정 1을 읽는다", () => {
    const results = parseDocument("신규.hwpx", newDesignation());
    expect(results).toHaveLength(1);
    expect(results[0].ministry).toBe("해수부");
    expect(results[0].category).toBe("신규지정");
    expect(results[0].count).toEqual(num(1));
  });

  it("신규지정 건수가 여러 자리여도 읽는다", () => {
    const lines = newDesignation();
    lines[1] = "유형 | 〈신규지정〉 80개";
    expect(parseDocument("신규.hwpx", lines)[0].count).toEqual(num(80));
  });

  it("규격추가 문구에 숫자가 비어 있으면 규격추가는 빈칸이다 (사진 속 문서)", () => {
    const results = parseDocument(
      "신규.hwpx",
      newDesignation(["〈기존 FT 및 유형 | 규격추가 혁신제품〉 개 (※제품수 기준)"]),
    );
    expect(results.map((r) => r.category)).toEqual(["신규지정", "규격추가"]);
    expect(results[1].count).toEqual(EMPTY);
  });

  it("규격추가 문구에 숫자가 있으면 같은 문서에서 규격추가도 읽는다", () => {
    const results = parseDocument(
      "신규.hwpx",
      newDesignation(["〈기존 FT 및 유형 | 규격추가 혁신제품〉 3개 (※제품수 기준)"]),
    );
    expect(results[1].category).toBe("규격추가");
    expect(results[1].count).toEqual(num(3));
  });

  it("신규지정이 0건('-')이면 빈칸이다", () => {
    const lines = newDesignation();
    lines[1] = "유형 | 〈신규지정〉 -개";
    expect(parseDocument("신규.hwpx", lines)[0].count).toEqual(EMPTY);
  });
});

describe("parseDocument: 읽을 수 없는 경우", () => {
  it("어느 구분인지 알아볼 수 없으면 구분 없음으로 돌려주고 이유를 남긴다", () => {
    const [result] = parseDocument("모름.hwpx", ["해양수산부", "아무 내용"]);
    expect(result.ministry).toBe("해수부");
    expect(result.category).toBeNull();
    expect(result.problem).toContain("알아보지 못했어요");
  });

  it("부처명을 못 읽으면 부처명 없음으로 돌려주고 이유를 남긴다", () => {
    const lines = ["혁신제품 검토 결과", "유형 | 〈신규지정〉 1개"];
    const [result] = parseDocument("신규.hwpx", lines);
    expect(result.ministry).toBeNull();
    expect(result.category).toBe("신규지정");
    expect(result.problem).toContain("부처명");
  });

  it("줄이 하나도 없는 문서도 오류 없이 처리한다", () => {
    const [result] = parseDocument("빈.hwpx", []);
    expect(result.ministry).toBeNull();
    expect(result.category).toBeNull();
  });
});
