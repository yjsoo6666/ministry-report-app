// 한 엑셀 파일에 시트 1 "기준표"와 (지난 차수 표가 있으면) 시트 2 "비교표"를 함께 담는다.

import ExcelJS from "exceljs";
import type { ComparisonTable } from "../table/compareTables";
import type { Table } from "../types";
import { fillComparisonSheet } from "./writeComparison";
import { fillReportSheet } from "./writeReport";

export async function writeWorkbook(
  table: Table,
  comparison: ComparisonTable | null,
  labels: { current: string; previous: string; named: boolean },
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  fillReportSheet(workbook.addWorksheet("기준표"), table);
  if (comparison) {
    const name = labels.named ? `${labels.previous} 대비 비교표` : "비교표";
    fillComparisonSheet(workbook.addWorksheet(name), comparison, labels.current);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
