import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { readReport, ReportReadError } from "../lib/excel/readReport";
import { writeReport } from "../lib/excel/writeReport";
import { buildTable } from "../lib/table/buildTable";
import type { Cell, ParsedFile } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const EMPTY: Cell = { kind: "empty" };
const CHECK: Cell = { kind: "check" };

const file = (
  fileName: string,
  ministry: string,
  category: ParsedFile["category"],
  count: Cell,
): ParsedFile => ({ fileName, ministry, category, count });

async function toBytes(workbook: ExcelJS.Workbook): Promise<Uint8Array> {
  return new Uint8Array((await workbook.xlsx.writeBuffer()) as ArrayBuffer);
}

describe("readReport", () => {
  it("이 앱이 만든 기준표를 다시 읽으면 부처별 숫자가 그대로 나온다", async () => {
    const table = buildTable([
      file("1", "조달청", "신규지정", num(80)),
      file("2", "조달청", "2차연장", num(19)),
      file("3", "해수부", "신규지정", num(1)),
      file("4", "행안부", "1차연장", CHECK),
    ]).table;
    const report = await readReport(await writeReport(table));

    expect(report.rows.map((r) => r.ministry)).toEqual(["조달청", "해수부", "행안부"]);
    expect(report.rows[0].cells).toEqual({
      신규지정: num(80),
      "1차연장": EMPTY,
      "2차연장": num(19),
      지정취소: EMPTY,
      규격추가: EMPTY,
    });
    expect(report.rows[2].cells["1차연장"]).toEqual(CHECK);
  });

  it("계 줄은 읽지 않는다", async () => {
    const table = buildTable([file("1", "조달청", "신규지정", num(80))]).table;
    const report = await readReport(await writeReport(table));
    expect(report.rows).toHaveLength(1);
    expect(report.rows.some((r) => r.ministry === "계")).toBe(false);
  });

  it("예시 기준표처럼 왼쪽·위에 빈 칸이 있고 이름이 정식 명칭이어도 읽는다", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    // B2부터 표가 시작하는 모양 (사진 속 예시와 같다)
    ["신규 지정", "1차 연장", "2차 연장", "지정취소", "규격추가"].forEach((label, i) => {
      sheet.getCell(2, 3 + i).value = label;
    });
    sheet.getCell(3, 2).value = "해양수산부";
    sheet.getCell(3, 3).value = 1;
    sheet.getCell(3, 5).value = 1;
    sheet.getCell(4, 2).value = "조달청";
    sheet.getCell(4, 3).value = 80;
    sheet.getCell(4, 4).value = "26"; // 글자로 적힌 숫자
    sheet.getCell(4, 6).value = "-"; // 없음
    sheet.getCell(5, 2).value = "계";
    sheet.getCell(5, 3).value = 81;

    const report = await readReport(await toBytes(workbook));
    expect(report.rows.map((r) => r.ministry)).toEqual(["해수부", "조달청"]);
    expect(report.rows[0].cells.신규지정).toEqual(num(1));
    expect(report.rows[0].cells["2차연장"]).toEqual(num(1));
    expect(report.rows[0].cells["1차연장"]).toEqual(EMPTY);
    expect(report.rows[1].cells["1차연장"]).toEqual(num(26));
    expect(report.rows[1].cells.지정취소).toEqual(EMPTY);
  });

  it("알 수 없는 글자가 든 칸은 확인 필요로 읽는다", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    ["신규 지정", "1차 연장", "2차 연장", "지정취소", "규격추가"].forEach((label, i) => {
      sheet.getCell(1, 2 + i).value = label;
    });
    sheet.getCell(2, 1).value = "산림청";
    sheet.getCell(2, 2).value = "약 3";
    const report = await readReport(await toBytes(workbook));
    expect(report.rows[0].cells.신규지정).toEqual(CHECK);
  });

  it("구분 제목이 없는 엑셀이면 이 앱이 만든 기준표인지 확인하라고 알린다", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Sheet1").getCell(1, 1).value = "아무 표";
    await expect(readReport(await toBytes(workbook))).rejects.toThrow("머리글");
  });

  it("엑셀 파일이 아니면 열 수 없다고 알린다", async () => {
    const bytes = new TextEncoder().encode("엑셀 아님");
    await expect(readReport(bytes)).rejects.toBeInstanceOf(ReportReadError);
  });
});
