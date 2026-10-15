import { describe, expect, it } from "vitest";
import { parseFile } from "../lib/parse/parseFile";
import { makeHwpx } from "./helpers/makeHwpx";

describe("parseFile", () => {
  it(".hwpx 파일을 열어 글자를 꺼내고 부처명·구분·건수를 읽는다", async () => {
    const data = await makeHwpx([
      [
        "[해양수산부]혁신제품 지정 2차 연장 검토",
        "접수 현황(5개)",
        "인정 대상 요약(1개)",
        "미인정 대상 요약(4개)",
      ],
    ]);
    const results = await parseFile("3-1.(해양수산부) 2차 연장.hwpx", data);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      ministry: "해수부",
      category: "2차연장",
      count: { kind: "number", value: 1 },
    });
  });

  it("확장자 대소문자를 가리지 않는다", async () => {
    const data = await makeHwpx([["해양수산부", "유형 | 〈신규지정〉 2개"]]);
    const results = await parseFile("신규.HWPX", data);
    expect(results[0]).toMatchObject({ category: "신규지정", count: { kind: "number", value: 2 } });
  });

  it("구형 .hwp는 .hwpx로 다시 저장해 올리라고 안내한다", async () => {
    const results = await parseFile("옛날.hwp", new Uint8Array([1, 2, 3]));
    expect(results).toHaveLength(1);
    expect(results[0].ministry).toBeNull();
    expect(results[0].category).toBeNull();
    expect(results[0].problem).toContain(".hwpx로 다시 저장");
  });

  it("열 수 없는 .hwpx는 이유와 함께 구분 없음으로 돌려준다 (오류를 던지지 않는다)", async () => {
    const results = await parseFile("깨짐.hwpx", new TextEncoder().encode("한글 파일 아님"));
    expect(results[0].category).toBeNull();
    expect(results[0].problem).toContain("열 수 없어요");
  });

  it("한글 파일이 아닌 확장자는 알려 준다", async () => {
    const results = await parseFile("표.xlsx", new Uint8Array([1]));
    expect(results[0].problem).toContain("한글 파일");
  });
});
