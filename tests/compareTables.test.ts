import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { writeComparison } from "../lib/excel/writeComparison";
import { buildTable } from "../lib/table/buildTable";
import {
  compareTables,
  comparisonRowLabel,
  formatComparisonCell,
} from "../lib/table/compareTables";
import type { Category, Cell, ParsedFile, PreviousReport } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const EMPTY: Cell = { kind: "empty" };
const CHECK: Cell = { kind: "check" };

const file = (
  fileName: string,
  ministry: string,
  category: ParsedFile["category"],
  count: Cell,
): ParsedFile => ({ fileName, ministry, category, count });

function prevRow(ministry: string, cells: Partial<Record<Category, Cell>>) {
  return {
    ministry,
    cells: {
      신규지정: EMPTY,
      "1차연장": EMPTY,
      "2차연장": EMPTY,
      지정취소: EMPTY,
      규격추가: EMPTY,
      ...cells,
    },
  };
}

describe("compareTables", () => {
  it("같은 부처는 이번 숫자와 지난 차수 대비 증감을 계산한다", () => {
    const current = buildTable([file("1", "조달청", "신규지정", num(80))]).table;
    const previous: PreviousReport = { rows: [prevRow("조달청", { 신규지정: num(78) })] };
    const result = compareTables(current, previous);
    expect(result.rows[0].status).toBe("same");
    expect(result.rows[0].cells.신규지정).toEqual({ kind: "value", current: 80, diff: 2 });
  });

  it("줄었으면 음수, 같으면 0이다", () => {
    const current = buildTable([
      file("1", "조달청", "신규지정", num(5)),
      file("2", "조달청", "1차연장", num(3)),
    ]).table;
    const previous: PreviousReport = {
      rows: [prevRow("조달청", { 신규지정: num(8), "1차연장": num(3) })],
    };
    const cells = compareTables(current, previous).rows[0].cells;
    expect(cells.신규지정).toEqual({ kind: "value", current: 5, diff: -3 });
    expect(cells["1차연장"]).toEqual({ kind: "value", current: 3, diff: 0 });
  });

  it("이번에 건수가 없고 지난번에 있었으면 0 (-지난 숫자)로 본다", () => {
    const current = buildTable([file("1", "조달청", "신규지정", num(1))]).table;
    const previous: PreviousReport = { rows: [prevRow("조달청", { "2차연장": num(4) })] };
    expect(compareTables(current, previous).rows[0].cells["2차연장"]).toEqual({
      kind: "value",
      current: 0,
      diff: -4,
    });
  });

  it("이번에도 지난번에도 건수가 없으면 빈칸이다", () => {
    const current = buildTable([file("1", "조달청", "신규지정", num(1))]).table;
    const previous: PreviousReport = { rows: [prevRow("조달청", { 신규지정: num(1) })] };
    expect(compareTables(current, previous).rows[0].cells.지정취소).toEqual({ kind: "empty" });
  });

  it("이번에 새로 생긴 부처는 신규로 표시하고 증감은 없다", () => {
    const current = buildTable([file("1", "해수부", "신규지정", num(1))]).table;
    const result = compareTables(current, { rows: [] });
    expect(result.rows[0].status).toBe("new");
    expect(result.rows[0].cells.신규지정).toEqual({ kind: "value", current: 1, diff: null });
    expect(comparisonRowLabel(result.rows[0])).toBe("해수부 (신규)");
  });

  it("지난 차수에는 있었지만 이번에 파일이 없는 부처도 행을 남긴다", () => {
    const current = buildTable([file("1", "해수부", "신규지정", num(1))]).table;
    const previous: PreviousReport = { rows: [prevRow("산림청", { "1차연장": num(1) })] };
    const result = compareTables(current, previous);
    expect(result.rows.map((r) => r.ministry)).toEqual(["해수부", "산림청"]);
    expect(result.rows[1].status).toBe("missing");
    expect(result.rows[1].cells["1차연장"]).toEqual({ kind: "value", current: 0, diff: -1 });
    expect(comparisonRowLabel(result.rows[1])).toBe("산림청 (이번 차수 없음)");
  });

  it("확인 필요가 한쪽에 있으면 그 칸의 증감은 확인 필요다", () => {
    const current = buildTable([file("1", "조달청", "신규지정", CHECK)]).table;
    const previous: PreviousReport = { rows: [prevRow("조달청", { 신규지정: num(3) })] };
    expect(compareTables(current, previous).rows[0].cells.신규지정).toEqual({ kind: "check" });

    const current2 = buildTable([file("1", "조달청", "신규지정", num(3))]).table;
    const previous2: PreviousReport = { rows: [prevRow("조달청", { 신규지정: CHECK })] };
    expect(compareTables(current2, previous2).rows[0].cells.신규지정).toEqual({ kind: "check" });
  });

  it("계 줄은 이번 계와 지난 차수 계(다시 더한 값)를 비교한다", () => {
    const current = buildTable([
      file("1", "조달청", "신규지정", num(80)),
      file("2", "해수부", "신규지정", num(1)),
    ]).table;
    const previous: PreviousReport = {
      rows: [prevRow("조달청", { 신규지정: num(70) }), prevRow("산림청", { 신규지정: num(5) })],
    };
    const totals = compareTables(current, previous).totals;
    expect(totals.신규지정).toEqual({ kind: "value", current: 81, diff: 6 });
    expect(totals.지정취소).toEqual({ kind: "value", current: 0, diff: 0 });
  });

  it("지난 차수에 같은 부처가 두 번 나오면 하나로 합쳐 비교한다", () => {
    const current = buildTable([file("1", "조달청", "신규지정", num(10))]).table;
    const previous: PreviousReport = {
      rows: [prevRow("조달청", { 신규지정: num(4) }), prevRow("조달청", { 신규지정: num(3) })],
    };
    const result = compareTables(current, previous);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cells.신규지정).toEqual({ kind: "value", current: 10, diff: 3 });
  });
});

describe("formatComparisonCell", () => {
  it("예시처럼 '9 (+2)' 형태로 만든다", () => {
    expect(formatComparisonCell({ kind: "value", current: 9, diff: 2 })).toBe("9 (+2)");
    expect(formatComparisonCell({ kind: "value", current: 4, diff: -1 })).toBe("4 (-1)");
    expect(formatComparisonCell({ kind: "value", current: 3, diff: 0 })).toBe("3 (0)");
    expect(formatComparisonCell({ kind: "value", current: 3, diff: null })).toBe("3");
    expect(formatComparisonCell({ kind: "empty" })).toBe("");
    expect(formatComparisonCell({ kind: "check" })).toBe("확인 필요");
  });
});

describe("writeComparison", () => {
  it("기준표와 같은 모양에 증감이 들어간 엑셀을 만든다", async () => {
    const current = buildTable([
      file("1", "조달청", "신규지정", num(80)),
      file("2", "조달청", "2차연장", num(19)),
      file("3", "해수부", "신규지정", num(1)),
    ]).table;
    const previous: PreviousReport = {
      rows: [prevRow("조달청", { 신규지정: num(78), "2차연장": num(19) }), prevRow("산림청", { 신규지정: num(2) })],
    };
    const bytes = await writeComparison(compareTables(current, previous));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("비교표")!;
    expect(sheet.getRow(1).getCell(2).value).toBe("신규 지정");
    expect(sheet.getRow(2).getCell(1).value).toBe("조달청");
    expect(sheet.getRow(2).getCell(2).value).toBe("80 (+2)");
    expect(sheet.getRow(2).getCell(4).value).toBe("19 (0)");
    expect(sheet.getRow(3).getCell(1).value).toBe("해수부 (신규)");
    expect(sheet.getRow(3).getCell(2).value).toBe("1");
    expect(sheet.getRow(4).getCell(1).value).toBe("산림청 (이번 차수 없음)");
    expect(sheet.getRow(4).getCell(2).value).toBe("0 (-2)");
    expect(sheet.getRow(5).getCell(1).value).toBe("계");
    expect(sheet.getRow(5).getCell(2).value).toBe("81 (+1)");
  });
});
