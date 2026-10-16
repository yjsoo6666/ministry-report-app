import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { writeWorkbook } from "../lib/excel/writeWorkbook";
import { compareTables } from "../lib/table/compareTables";
import { applyRenames, findUnmatched } from "../lib/table/matchMinistries";
import { buildTable } from "../lib/table/buildTable";
import { roundLabels } from "../lib/table/roundLabels";
import type { Cell, ParsedFile, PreviousReport } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const EMPTY: Cell = { kind: "empty" };
const cells = (신규: Cell) => ({ 신규지정: 신규, "1차연장": EMPTY, "2차연장": EMPTY, 지정취소: EMPTY, 규격추가: EMPTY });

const files: ParsedFile[] = [
  { fileName: "a", ministry: "기후부", category: "신규지정", count: num(3) },
  { fileName: "b", ministry: "산림청", category: "신규지정", count: num(2) },
];
const previous: PreviousReport = {
  rows: [
    { ministry: "환경부", cells: cells(num(1)) },
    { ministry: "산림청", cells: cells(num(2)) },
  ],
};

describe("부처 이름 짝 맞추기", () => {
  it("이름이 안 맞는 부처를 양쪽에서 찾는다", () => {
    const { table } = buildTable(files);
    expect(findUnmatched(table, previous)).toEqual({ currentOnly: ["기후부"], previousOnly: ["환경부"] });
  });

  it("같은 부처라고 알려 주면 지난 표의 이름을 바꿔서 증감을 계산한다", () => {
    const { table } = buildTable(files);
    const renamed = applyRenames(previous, { 기후부: "환경부" });
    const result = compareTables(table, renamed);
    expect(result.rows[0].ministry).toBe("기후부");
    expect(result.rows[0].status).toBe("same");
    expect(result.rows[0].cells.신규지정).toEqual({ kind: "value", current: 3, diff: 2 });
    expect(findUnmatched(table, renamed)).toEqual({ currentOnly: [], previousOnly: [] });
  });

  it("알려 주지 않으면 이번에만 있는 부처는 신규, 지난 표에만 있는 부처는 없음으로 남는다", () => {
    const { table } = buildTable(files);
    const result = compareTables(table, previous);
    expect(result.rows.map((r) => [r.ministry, r.status])).toEqual([
      ["기후부", "new"],
      ["산림청", "same"],
      ["환경부", "missing"],
    ]);
  });
});

describe("한 파일에 기준표와 비교표 시트 담기", () => {
  it("지난 표가 있으면 시트 2개, 없으면 기준표 시트 1개다", async () => {
    const { table } = buildTable(files);
    const labels = roundLabels("4");
    const withCmp = await writeWorkbook(table, compareTables(table, previous), labels);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(withCmp as unknown as ArrayBuffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["기준표", "3차 대비 비교표"]);
    expect(wb.worksheets[0].getRow(2).getCell(2).value).toBe(3);

    const only = await writeWorkbook(table, null, labels);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(only as unknown as ArrayBuffer);
    expect(wb2.worksheets.map((s) => s.name)).toEqual(["기준표"]);
  });
});
