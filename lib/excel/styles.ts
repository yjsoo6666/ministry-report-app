// Design Ref: §5 ⑤ 엑셀 만들기 — 기준표와 비교표가 같은 모양을 쓰도록 서식을 한곳에 모은다.

import type ExcelJS from "exceljs";

export const CHECK_TEXT = "확인 필요";

const FONT_NAME = "맑은 고딕";
export const HEADER_FILL = "FFE6B8E6"; // 예시 기준표 머리글의 연보라
export const TOTAL_FILL = "FFC6E0B4"; // 예시 기준표 "계" 행의 연두
const THIN = { style: "thin" as const, color: { argb: "FF000000" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export function styleCell(
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

// 첫 열(부처 이름)은 넓게, 나머지 구분 열은 같은 너비로 맞춘다.
export function setColumnWidths(sheet: ExcelJS.Worksheet, categoryCount: number, firstWidth = 16) {
  sheet.getColumn(1).width = firstWidth;
  for (let i = 2; i <= categoryCount + 1; i++) {
    sheet.getColumn(i).width = 12;
  }
}
