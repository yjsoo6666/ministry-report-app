// 사진 속 예시 기준표(계 89·33·48·4·3)를 엑셀 파일로 만든다. "3차 표"로 올려서 비교표를 시험할 때 쓴다.
// 사진처럼 A열·1행을 비우고 B2부터 시작하는 모양이다.
//
// 사용법: npx tsx scripts/make-previous-report.ts   → samples/3차_기준표.xlsx

import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { styleCell, HEADER_FILL, TOTAL_FILL } from "../lib/excel/styles";

const HEADERS = ["신규 지정", "1차 연장", "2차 연장", "지정취소", "규격추가"];

// 사진에서 읽은 값. null은 빈칸이다. 순서: 신규 지정, 1차 연장, 2차 연장, 지정취소, 규격추가
const ROWS: Array<[string, Array<number | null>]> = [
  ["지재처", [null, null, 9, null, null]],
  ["산림청", [null, 1, null, 1, null]],
  ["기상청", [null, null, null, null, 1]],
  ["기후부", [null, 4, 4, null, null]],
  ["국토교통부", [8, null, 4, null, 2]],
  ["행안부", [null, 1, 3, null, null]],
  ["산업부", [null, null, 8, null, null]],
  ["중기부", [null, 1, null, null, null]],
  ["해수부", [1, null, 1, null, null]],
  ["조달청", [80, 26, 19, 3, null]],
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.getColumn(2).width = 16;
  for (let c = 3; c <= 7; c++) sheet.getColumn(c).width = 12;

  const header = sheet.getRow(2);
  styleCell(header.getCell(2), { bold: true, fill: HEADER_FILL });
  HEADERS.forEach((label, i) => {
    header.getCell(3 + i).value = label;
    styleCell(header.getCell(3 + i), { bold: true, fill: HEADER_FILL });
  });

  const totals = [0, 0, 0, 0, 0];
  ROWS.forEach(([name, values], index) => {
    const row = sheet.getRow(3 + index);
    row.getCell(2).value = name;
    styleCell(row.getCell(2), { bold: true });
    values.forEach((value, i) => {
      if (value !== null) {
        row.getCell(3 + i).value = value;
        totals[i] += value;
      }
      styleCell(row.getCell(3 + i));
    });
  });

  const totalRow = sheet.getRow(3 + ROWS.length);
  totalRow.getCell(2).value = "계";
  styleCell(totalRow.getCell(2), { bold: true, fill: TOTAL_FILL });
  totals.forEach((sum, i) => {
    totalRow.getCell(3 + i).value = sum;
    styleCell(totalRow.getCell(3 + i), { bold: true, fill: TOTAL_FILL });
  });

  mkdirSync("samples", { recursive: true });
  await workbook.xlsx.writeFile("samples/3차_기준표.xlsx");
  console.log("만들었어요 → samples/3차_기준표.xlsx, 계:", totals.join("·"));
}

main().catch((error) => {
  console.error("만들지 못했어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
