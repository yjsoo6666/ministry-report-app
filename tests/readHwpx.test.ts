import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractLinesFromSectionXml, HwpxReadError, readHwpxLines } from "../lib/reader/readHwpx";
import { makeHwpx } from "./helpers/makeHwpx";

describe("extractLinesFromSectionXml", () => {
  it("문단마다 한 줄로 꺼낸다", () => {
    const xml = "<hp:p><hp:t>첫째 줄</hp:t></hp:p><hp:p><hp:t>둘째 줄</hp:t></hp:p>";
    expect(extractLinesFromSectionXml(xml)).toEqual(["첫째 줄", "둘째 줄"]);
  });

  it("한 문단 안의 여러 글자 조각은 이어 붙인다", () => {
    const xml =
      "<hp:p><hp:run><hp:t>인정 대상 요약(</hp:t></hp:run><hp:run><hp:t>1</hp:t></hp:run><hp:run><hp:t>개)</hp:t></hp:run></hp:p>";
    expect(extractLinesFromSectionXml(xml)).toEqual(["인정 대상 요약(1개)"]);
  });

  it("글자 사이에 끼어 있는 다른 태그는 버리고, 기호(엔티티)는 되돌린다", () => {
    const xml = '<hp:p><hp:t>A &amp; B<hp:tab width="10"/> &lt;신규지정&gt;</hp:t></hp:p>';
    expect(extractLinesFromSectionXml(xml)).toEqual(["A & B <신규지정>"]);
  });

  it("글자가 없는 문단은 줄로 치지 않고, 여러 공백은 하나로 줄인다", () => {
    const xml = "<hp:p></hp:p><hp:p><hp:t>  가   나  </hp:t></hp:p><hp:p><hp:t> </hp:t></hp:p>";
    expect(extractLinesFromSectionXml(xml)).toEqual(["가 나"]);
  });

  it("속성이 붙은 <hp:t> 태그도 읽는다", () => {
    expect(extractLinesFromSectionXml('<hp:p><hp:t charPrIDRef="3">글자</hp:t></hp:p>')).toEqual([
      "글자",
    ]);
  });
});

describe("readHwpxLines", () => {
  it("압축 파일 안의 본문 글자를 줄 목록으로 꺼낸다", async () => {
    const data = await makeHwpx([["해양수산부", "유형 | 〈신규지정〉 1개"]]);
    expect(await readHwpxLines(data)).toEqual(["해양수산부", "유형 | 〈신규지정〉 1개"]);
  });

  it("section이 여러 개면 번호 순서대로 이어서 꺼낸다", async () => {
    const data = await makeHwpx([["첫째"], ["둘째"], ["셋째"]]);
    expect(await readHwpxLines(data)).toEqual(["첫째", "둘째", "셋째"]);
  });

  it("압축 파일이 아니면 읽을 수 없다고 알린다", async () => {
    const notZip = new TextEncoder().encode("이건 한글 파일이 아닙니다");
    await expect(readHwpxLines(notZip)).rejects.toBeInstanceOf(HwpxReadError);
  });

  it("본문(section)이 없는 압축 파일이면 본문을 찾지 못했다고 알린다", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/hwp+zip");
    const data = await zip.generateAsync({ type: "uint8array" });
    await expect(readHwpxLines(data)).rejects.toThrow("본문을 찾지 못했어요");
  });
});
