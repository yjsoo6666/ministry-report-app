// Design Ref: §5 ⑤ 엑셀 만들기 — 표를 예시 기준표 모양의 .xlsx 파일로 만든다.
// Plan SC: 작업 11번. 가로는 5개 구분, 세로는 부처, 맨 아래는 "계" 행. 부처 수만큼 행이 늘어난다.

import ExcelJS from "exceljs";
import { CATEGORIES, CATEGORY_LABELS, type Cell, type Table } from "../types";

export const CHECK_TEXT = "확인 필요";

const FONT_NAME = "맑은 고딕";
const HEADER_FILL = "FFE6B8E6"; // 예시 기준표 머리글의 연보라
const TOTAL_FILL = "FFC6E0B4"; // 예시 기준표 "계" 행의 연두
const THIN = { style: "thin" as const, color: { argb: "FF000000" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function styleCell(
  cell: ExcelJS.Cell,
  options: { bold?: boolean; fill?: string; color?: string } = {},
) {
  cell.font = {
    name: FONT_NAME,
    size: 11,
    bold: options.bold ?? false,
    color: options.color ? { argb: options.color } : undefined,
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = BORDER;
  if (options.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options.fill } };
  }
}

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

// 표를 기준표 엑셀 파일(바이트)로 만든다.
export async function writeReport(table: Table): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("기준표");

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

  sheet.getColumn(1).width = 16;
  for (let i = 2; i <= CATEGORIES.length + 1; i++) {
    sheet.getColumn(i).width = 12;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
