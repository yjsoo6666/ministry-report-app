import { describe, expect, it } from "vitest";
import { toShortMinistryName } from "../lib/parse/ministryNames";

describe("toShortMinistryName", () => {
  it("정식 이름을 줄임말로 바꾼다", () => {
    expect(toShortMinistryName("지식재산처")).toBe("지재처");
    expect(toShortMinistryName("행정안전부")).toBe("행안부");
    expect(toShortMinistryName("해양수산부")).toBe("해수부");
    expect(toShortMinistryName("산업통상부")).toBe("산업부");
  });

  it("이름이 바뀌기 전 정식 이름도 알아본다", () => {
    expect(toShortMinistryName("산업통상자원부")).toBe("산업부");
  });

  it("'중소'와 '기업'이 들어 있으면 중기부로 바꾼다", () => {
    expect(toShortMinistryName("중소벤처기업부")).toBe("중기부");
    expect(toShortMinistryName("중소기업청")).toBe("중기부");
  });

  it("'기후'가 들어 있으면 기후부로 바꾼다", () => {
    expect(toShortMinistryName("기후에너지환경부")).toBe("기후부");
    expect(toShortMinistryName("기후부")).toBe("기후부");
  });

  it("이미 줄임말이면 그대로 둔다", () => {
    expect(toShortMinistryName("해수부")).toBe("해수부");
    expect(toShortMinistryName("행안부")).toBe("행안부");
    expect(toShortMinistryName("지재처")).toBe("지재처");
    expect(toShortMinistryName("산업부")).toBe("산업부");
    expect(toShortMinistryName("중기부")).toBe("중기부");
  });

  it("규칙에 없는 부처는 이름 그대로 돌려준다", () => {
    expect(toShortMinistryName("국토교통부")).toBe("국토교통부");
    expect(toShortMinistryName("산림청")).toBe("산림청");
    expect(toShortMinistryName("기상청")).toBe("기상청");
    expect(toShortMinistryName("조달청")).toBe("조달청");
    expect(toShortMinistryName("과학기술정보통신부")).toBe("과학기술정보통신부");
  });

  it("글자 사이 공백이 있어도 알아보고, 모르는 이름은 앞뒤 공백만 정리한다", () => {
    expect(toShortMinistryName("해양 수산부")).toBe("해수부");
    expect(toShortMinistryName("  행정안전부  ")).toBe("행안부");
    expect(toShortMinistryName("  국토 교통부 ")).toBe("국토 교통부");
  });

  it("빈 문자열은 빈 문자열로 돌려준다", () => {
    expect(toShortMinistryName("")).toBe("");
  });
});
