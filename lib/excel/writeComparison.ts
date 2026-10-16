// Design Ref: §5.2 비교표 — 기준표와 같은 표에 지난 차수 대비 증감을 덧붙인 엑셀을 만든다.
// Plan SC: 작업 15번. 기준표 파일에는 비교 내용을 넣지 않고, 이 파일을 따로 만든다.
// 표 아래에 "구분별 합계" 숫자표를 만들고, 그것으로 지난 차수와 이번 차수를 견주는 막대그래프를 넣는다.

import ExcelJS from "exceljs";
import {
  comparisonRowLabel,
  formatComparisonCell,
  type ComparisonCell,
  type ComparisonTable,
} from "../table/compareTables";
import { CATEGORIES, CATEGORY_LABELS } from "../types";
import { addCharts, sheetRef, type ChartSpec } from "./charts";
import { CHECK_TEXT, HEADER_FILL, TOTAL_FILL, setColumnWidths, styleCell } from "./styles";

const SHEET_NAME = "비교표";

function writeCell(cell: ExcelJS.Cell, value: ComparisonCell, bold = false, fill?: string) {
  const text = formatComparisonCell(value);
  if (text !== "") cell.value = text;
  styleCell(cell, {
    bold: bold || text === CHECK_TEXT,
    fill,
    color: text === CHECK_TEXT ? "FFC00000" : undefined,
  });
}

export async function writeComparison(
  comparison: ComparisonTable,
  currentLabel = "이번 차수",
  previousLabel = "지난 차수",
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  const charts = fillComparisonSheet(sheet, comparison, currentLabel, previousLabel);
  const buffer = await workbook.xlsx.writeBuffer();
  return addCharts(new Uint8Array(buffer as ArrayBuffer), charts);
}

// 비교표를 엑셀 시트에 쓰고, 넣을 그래프를 돌려준다. (그래프를 그릴 수 없으면 빈 목록)
export function fillComparisonSheet(
  sheet: ExcelJS.Worksheet,
  comparison: ComparisonTable,
  currentLabel = "이번 차수",
  previousLabel = "지난 차수",
): ChartSpec[] {
  const header = sheet.getRow(1);
  styleCell(header.getCell(1), { bold: true, fill: HEADER_FILL });
  CATEGORIES.forEach((category, i) => {
    const cell = header.getCell(i + 2);
    cell.value = CATEGORY_LABELS[category];
    styleCell(cell, { bold: true, fill: HEADER_FILL });
  });

  comparison.rows.forEach((row, r) => {
    const excelRow = sheet.getRow(r + 2);
    const nameCell = excelRow.getCell(1);
    nameCell.value = comparisonRowLabel(row, currentLabel);
    styleCell(nameCell, { bold: true });
    CATEGORIES.forEach((category, i) => {
      writeCell(excelRow.getCell(i + 2), row.cells[category]);
    });
  });

  const totalRow = sheet.getRow(comparison.rows.length + 2);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = "계";
  styleCell(totalLabel, { bold: true, fill: TOTAL_FILL });
  CATEGORIES.forEach((category, i) => {
    writeCell(totalRow.getCell(i + 2), comparison.totals[category], true, TOTAL_FILL);
  });

  // 부처 이름에 "(4차 없음)" 같은 표시가 붙을 수 있어 첫 열을 조금 더 넓게 둔다.
  setColumnWidths(sheet, CATEGORIES.length, 22);

  return comparisonCharts(sheet, comparison, currentLabel, previousLabel);
}

// 구분별 합계(지난 차수, 이번 차수)를 숫자표로 적고 막대그래프를 정한다.
// 합계 중 하나라도 "확인 필요"이거나 비교할 지난 값이 없으면 그래프를 만들지 않는다.
function comparisonCharts(
  sheet: ExcelJS.Worksheet,
  comparison: ComparisonTable,
  currentLabel: string,
  previousLabel: string,
): ChartSpec[] {
  const pairs = CATEGORIES.map((category) => {
    const cell = comparison.totals[category];
    return cell.kind === "value" && cell.diff !== null
      ? { category, previous: cell.current - cell.diff, current: cell.current }
      : null;
  });
  if (pairs.some((p) => p === null)) return [];
  const rows = pairs as { category: (typeof CATEGORIES)[number]; previous: number; current: number }[];

  const headerRow = comparison.rows.length + 5;
  const head = sheet.getRow(headerRow);
  [`구분별 합계`, previousLabel, currentLabel].forEach((text, i) => {
    head.getCell(i + 1).value = text;
    styleCell(head.getCell(i + 1), { bold: true, fill: HEADER_FILL });
  });
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(headerRow + 1 + i);
    excelRow.getCell(1).value = CATEGORY_LABELS[row.category];
    styleCell(excelRow.getCell(1), { bold: true });
    excelRow.getCell(2).value = row.previous;
    styleCell(excelRow.getCell(2));
    excelRow.getCell(3).value = row.current;
    styleCell(excelRow.getCell(3));
  });

  const first = headerRow + 1;
  const last = headerRow + rows.length;
  const categories = rows.map((r) => CATEGORY_LABELS[r.category]);
  return [
    {
      title: `구분별 합계: ${previousLabel} → ${currentLabel}`,
      kind: "clustered",
      showValues: true,
      from: { col: 7, row: 0 },
      to: { col: 15, row: 18 },
      series: [
        {
          name: previousLabel,
          nameRef: sheetRef(SHEET_NAME, `$B$${headerRow}`),
          categoriesRef: sheetRef(SHEET_NAME, `$A$${first}:$A$${last}`),
          valuesRef: sheetRef(SHEET_NAME, `$B$${first}:$B$${last}`),
          categories,
          values: rows.map((r) => r.previous),
          color: "A5A5A5",
        },
        {
          name: currentLabel,
          nameRef: sheetRef(SHEET_NAME, `$C$${headerRow}`),
          categoriesRef: sheetRef(SHEET_NAME, `$A$${first}:$A$${last}`),
          valuesRef: sheetRef(SHEET_NAME, `$C$${first}:$C$${last}`),
          categories,
          values: rows.map((r) => r.current),
          color: "4472C4",
        },
      ],
    },
  ];
}
