// Design Ref: §5.2 비교표 — 기준표와 같은 표에 지난 차수 대비 증감을 덧붙인 엑셀을 만든다.
// Plan SC: 작업 15번. 기준표 파일에는 비교 내용을 넣지 않고, 이 파일을 따로 만든다.

import ExcelJS from "exceljs";
import {
  comparisonRowLabel,
  formatComparisonCell,
  type ComparisonCell,
  type ComparisonTable,
} from "../table/compareTables";
import { CATEGORIES, CATEGORY_LABELS } from "../types";
import { CHECK_TEXT, HEADER_FILL, TOTAL_FILL, setColumnWidths, styleCell } from "./styles";

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
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("비교표");

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

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
