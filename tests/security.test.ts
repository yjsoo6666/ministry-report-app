import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { readReport, ReportReadError } from "../lib/excel/readReport";
import { MAX_SECTION_BYTES, MAX_UPLOAD_BYTES } from "../lib/limits";
import { isSafeMinistryName } from "../lib/parse/ministryNames";
import { parseDocument } from "../lib/parse/parseDocument";
import { parseFile } from "../lib/parse/parseFile";
import { extractLinesFromSectionXml, HwpxReadError, readHwpxLines } from "../lib/reader/readHwpx";
import { assertEntryCount, assertEntrySize, assertTotalSize, ZipGuardError } from "../lib/reader/zipGuard";

// 보안 시험: 조작된 파일이 브라우저를 멈추게 하거나, 엑셀에 수식이 끼어들지 못하는지 확인한다.

describe("조작된 XML에서도 빨리 끝난다 (정규식 폭주 방지)", () => {
  it("닫는 </hp:t>가 없는 <hp:t>가 20만 개 있어도 1초 안에 끝난다", () => {
    const xml = "<hp:p>" + "<hp:t>".repeat(200_000);
    const started = performance.now();
    extractLinesFromSectionXml(xml);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("'>'로 닫히지 않는 <hp:t 가 20만 개 있어도 1초 안에 끝난다", () => {
    const xml = "<hp:p>" + "<hp:t ".repeat(200_000);
    const started = performance.now();
    extractLinesFromSectionXml(xml);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("글자 안에 '<'가 20만 개 있고 '>'가 없어도 1초 안에 끝난다", () => {
    const xml = "<hp:p><hp:t>" + "<".repeat(200_000) + "</hp:t></hp:p>";
    const started = performance.now();
    const lines = extractLinesFromSectionXml(xml);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(lines).toHaveLength(1);
  });

  it("앞부분의 정상 글자는 읽고, 닫히지 않은 태그를 만나면 거기서 멈춘다", () => {
    const xml = "<hp:p><hp:t>정상 줄</hp:t></hp:p><hp:p><hp:t>닫히지 않음";
    expect(extractLinesFromSectionXml(xml)).toEqual(["정상 줄"]);
  });

  it("범위를 벗어난 숫자 기호(&#1114112;, &#x110000;)가 있어도 오류 없이 넘어간다", () => {
    const xml = "<hp:p><hp:t>가&#1114112;나&#x110000;다</hp:t></hp:p>";
    expect(extractLinesFromSectionXml(xml)).toEqual(["가나다"]);
  });

  it("너무 긴 숫자 기호는 해석하지 않고 글자 그대로 둔다 (오류 없음)", () => {
    const xml = "<hp:p><hp:t>가&#99999999999;나</hp:t></hp:p>";
    expect(extractLinesFromSectionXml(xml)).toEqual(["가&#99999999999;나"]);
  });
});

describe("파일 크기·압축 폭탄 방어", () => {
  it("한도(20MB)를 넘는 파일은 열지 않고 거절한다", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    await expect(readHwpxLines(big)).rejects.toBeInstanceOf(HwpxReadError);
    const results = await parseFile("큰파일.hwpx", big);
    expect(results[0].category).toBeNull();
    expect(results[0].problem).toContain("너무 커요");
    await expect(readReport(big)).rejects.toThrow("너무 커요");
  });

  it("작게 압축됐지만 풀면 한도(30MB)를 넘는 본문은 풀지 않고 거절한다", async () => {
    const zip = new JSZip();
    zip.file("Contents/section0.xml", "a".repeat(MAX_SECTION_BYTES + 1000), {
      compression: "DEFLATE",
    });
    const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    expect(data.byteLength).toBeLessThan(MAX_UPLOAD_BYTES); // 압축하면 아주 작다
    await expect(readHwpxLines(data)).rejects.toThrow("너무 커서");
  });

  it("zipGuard: 풀었을 때 크기와 항목 개수가 한도를 넘으면 오류를 낸다", async () => {
    const zip = new JSZip();
    zip.file("a.txt", "x".repeat(5000));
    zip.file("b.txt", "y".repeat(5000));
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: "uint8array" }));

    expect(() => assertEntrySize(loaded.files["a.txt"], 1000)).toThrow(ZipGuardError);
    expect(() => assertEntrySize(loaded.files["a.txt"], 10_000)).not.toThrow();
    expect(() => assertTotalSize(loaded, 9000)).toThrow(ZipGuardError);
    expect(() => assertTotalSize(loaded, 20_000)).not.toThrow();
    expect(() => assertEntryCount(loaded, 1)).toThrow(ZipGuardError);
    expect(() => assertEntryCount(loaded, 10)).not.toThrow();
  });
});

describe("부처 이름에 엑셀 수식이 끼어들지 못한다", () => {
  it("허용 글자(한글·영문·숫자·가운뎃점·괄호·공백, 30자까지)만 안전한 이름으로 본다", () => {
    expect(isSafeMinistryName("해수부")).toBe(true);
    expect(isSafeMinistryName("과학기술정보통신부")).toBe(true);
    expect(isSafeMinistryName("국가데이터처 (신설)")).toBe(true);
    expect(isSafeMinistryName("")).toBe(false);
    expect(isSafeMinistryName("   ")).toBe(false);
    expect(isSafeMinistryName("=1+1")).toBe(false);
    expect(isSafeMinistryName("+cmd|' /C calc'!A0")).toBe(false);
    expect(isSafeMinistryName("-2+3")).toBe(false);
    expect(isSafeMinistryName("@SUM(1,2)")).toBe(false);
    expect(isSafeMinistryName("부처\t이름")).toBe(false);
    expect(isSafeMinistryName("가".repeat(31))).toBe(false);
  });

  it.each([
    '[=HYPERLINK("http://example.com","클릭")]혁신제품 지정 2차 연장 검토',
    "[+cmd|' /C calc'!A0]혁신제품 지정 2차 연장 검토",
    "[@SUM(1,2)]혁신제품 지정 2차 연장 검토",
    "[-2+3]혁신제품 지정 2차 연장 검토",
  ])("문서 제목의 부처명이 수식 모양이면 표에 넣지 않는다: %s", (title) => {
    const [result] = parseDocument("공격.hwpx", [title, "인정 대상 요약(1개)"]);
    expect(result.ministry).toBeNull();
    expect(result.problem).toContain("쓸 수 없는 글자");
  });

  it("정상 부처명은 그대로 통과한다", () => {
    const [result] = parseDocument("정상.hwpx", [
      "[해양수산부]혁신제품 지정 2차 연장 검토",
      "인정 대상 요약(1개)",
    ]);
    expect(result.ministry).toBe("해수부");
  });

  it("지난 분기 엑셀의 부처 이름이 수식 모양이면 그 표를 쓰지 않는다", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    ["신규 지정", "1차 연장", "2차 연장", "지정취소", "규격추가"].forEach((label, i) => {
      sheet.getCell(1, 2 + i).value = label;
    });
    sheet.getCell(2, 1).value = '=HYPERLINK("http://example.com","클릭")';
    sheet.getCell(2, 2).value = 1;
    const bytes = new Uint8Array((await workbook.xlsx.writeBuffer()) as ArrayBuffer);
    await expect(readReport(bytes)).rejects.toBeInstanceOf(ReportReadError);
    await expect(readReport(bytes)).rejects.toThrow("쓸 수 없는 글자");
  });
});
