// Design Ref: §5 ⑤ 엑셀 만들기 — 표를 예시 기준표 모양의 .xlsx 파일로 만든다.
// Plan SC: 작업 11번. 가로는 5개 구분, 세로는 부처, 맨 아래는 "계" 행. 부처 수만큼 행이 늘어난다.
// 표 오른쪽에 막대그래프 2개(구분별 합계, 부처별 구성)를 함께 넣는다.

import ExcelJS from "exceljs";
import { CATEGORIES, CATEGORY_LABELS, type Cell, type Table } from "../types";
import { addCharts, sheetRef, type ChartSpec } from "./charts";
import { CHECK_TEXT, HEADER_FILL, TOTAL_FILL, setColumnWidths, styleCell } from "./styles";

export { CHECK_TEXT };

const SHEET_NAME = "기준표";
// 구분 5개에 쓰는 그래프 색 (같은 구분은 항상 같은 색)
const CATEGORY_COLORS = ["4472C4", "ED7D31", "A5A5A5", "FFC000", "70AD47"];
const COLUMN_LETTERS = ["B", "C", "D", "E", "F"];

// 칸 값을 엑셀 칸에 쓴다. 빈칸은 비워 두고, "확인 필요"는 글자로 쓴다.
function writeCell(cell: ExcelJS.Cell, value: Cell, bold = false, fill?: string) {
  if (value.kind === "number") {
    cell.value = value.value;
    styleCell(cell, { bold, fill });
  } else if (value.kind === "check") {
    cell.value = CHECK_TEXT;
    styleCell(cell, { bold: true, fill, color: "FFC00000" });
  } else {
    styleCell(cell, { bold, fill });
  }
}

const numberOrNull = (cell: Cell): number | null => (cell.kind === "number" ? cell.value : null);

// 표 오른쪽(H열부터)에 놓을 그래프 2개를 정한다. 부처가 없으면 그래프도 없다.
export function reportCharts(table: Table): ChartSpec[] {
  const n = table.rows.length;
  if (n === 0) return [];
  const labels = CATEGORIES.map((c) => CATEGORY_LABELS[c]);
  const totalsRow = n + 2;

  const totals: ChartSpec = {
    title: "구분별 합계",
    kind: "clustered",
    showValues: true,
    from: { col: 7, row: 0 },
    to: { col: 15, row: 16 },
    series: [
      {
        name: "합계",
        categoriesRef: sheetRef(SHEET_NAME, "$B$1:$F$1"),
        valuesRef: sheetRef(SHEET_NAME, `$B$${totalsRow}:$F$${totalsRow}`),
        categories: labels,
        values: CATEGORIES.map((c) => numberOrNull(table.totals[c])),
        color: "4472C4",
      },
    ],
  };

  const byMinistry: ChartSpec = {
    title: "부처별 구분 구성",
    kind: "stacked",
    from: { col: 7, row: 17 },
    to: { col: 15, row: 37 },
    series: CATEGORIES.map((category, i) => ({
      name: CATEGORY_LABELS[category],
      nameRef: sheetRef(SHEET_NAME, `$${COLUMN_LETTERS[i]}$1`),
      categoriesRef: sheetRef(SHEET_NAME, `$A$2:$A$${n + 1}`),
      valuesRef: sheetRef(SHEET_NAME, `$${COLUMN_LETTERS[i]}$2:$${COLUMN_LETTERS[i]}$${n + 1}`),
      categories: table.rows.map((row) => row.ministry),
      values: table.rows.map((row) => numberOrNull(row.cells[category])),
      color: CATEGORY_COLORS[i],
    })),
  };

  return [totals, byMinistry];
}

// 표를 기준표 엑셀 파일(바이트)로 만든다.
export async function writeReport(table: Table): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  fillReportSheet(workbook.addWorksheet(SHEET_NAME), table);
  const buffer = await workbook.xlsx.writeBuffer();
  return addCharts(new Uint8Array(buffer as ArrayBuffer), reportCharts(table));
}

// 표를 엑셀 시트 하나에 쓴다.
export function fillReportSheet(sheet: ExcelJS.Worksheet, table: Table) {
  // 머리글 줄: 빈 모서리 칸 + 구분 5개
  const header = sheet.getRow(1);
  styleCell(header.getCell(1), { bold: true, fill: HEADER_FILL });
  CATEGORIES.forEach((category, i) => {
    const cell = header.getCell(i + 2);
    cell.value = CATEGORY_LABELS[category];
    styleCell(cell, { bold: true, fill: HEADER_FILL });
  });

  // 부처 줄
  table.rows.forEach((row, r) => {
    const excelRow = sheet.getRow(r + 2);
    const nameCell = excelRow.getCell(1);
    nameCell.value = row.ministry;
    styleCell(nameCell, { bold: true });
    CATEGORIES.forEach((category, i) => {
      writeCell(excelRow.getCell(i + 2), row.cells[category]);
    });
  });

  // 맨 아래 "계" 줄
  const totalRow = sheet.getRow(table.rows.length + 2);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = "계";
  styleCell(totalLabel, { bold: true, fill: TOTAL_FILL });
  CATEGORIES.forEach((category, i) => {
    writeCell(totalRow.getCell(i + 2), table.totals[category], true, TOTAL_FILL);
  });

  setColumnWidths(sheet, CATEGORIES.length);
}
