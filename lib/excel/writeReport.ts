// Design Ref: §5 ⑤ 엑셀 만들기 — 표를 예시 기준표 모양의 .xlsx 파일로 만든다.
// Plan SC: 작업 11번. 가로는 5개 구분, 세로는 부처, 맨 아래는 "계" 행. 부처 수만큼 행이 늘어난다.

import ExcelJS from "exceljs";
import { CATEGORIES, CATEGORY_LABELS, type Cell, type Table } from "../types";
import { CHECK_TEXT, HEADER_FILL, TOTAL_FILL, setColumnWidths, styleCell } from "./styles";

export { CHECK_TEXT };

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

  setColumnWidths(sheet, CATEGORIES.length);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
