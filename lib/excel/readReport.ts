// Design Ref: §5.2 비교표 — 지난 분기 기준표 엑셀에서 부처별·구분별 숫자를 읽는다.
// Plan SC: 작업 14번. 정해진 칸 번호에 기대지 않고, 5개 구분 제목이 있는 줄을 찾아 표의 위치를 알아낸다.
// (예시 기준표처럼 왼쪽·위에 빈 칸이 있어도 읽는다.)

import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  MAX_REPORT_ROWS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  MAX_XLSX_TOTAL_BYTES,
  MAX_ZIP_ENTRIES,
} from "../limits";
import { isSafeMinistryName, toShortMinistryName } from "../parse/ministryNames";
import { assertEntryCount, assertTotalSize, ZipGuardError } from "../reader/zipGuard";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Cell, type PreviousReport } from "../types";

export class ReportReadError extends Error {}

const normalize = (text: string) => text.replace(/\s+/g, "");

// "신규 지정"과 "신규지정"처럼 띄어쓰기가 달라도 같은 구분으로 본다.
const CATEGORY_BY_LABEL = new Map<string, Category>(
  CATEGORIES.flatMap((c) => [
    [normalize(CATEGORY_LABELS[c]), c] as [string, Category],
    [normalize(c), c] as [string, Category],
  ]),
);

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(cell.text ?? value);
}

// 엑셀 칸 하나를 칸 값으로 바꾼다. 숫자는 숫자, 비었거나 "-"면 빈칸, 그 밖의 글자는 "확인 필요".
function toCell(cell: ExcelJS.Cell): Cell {
  const value = cell.value;
  if (typeof value === "number") return { kind: "number", value };
  const text = normalize(cellText(cell));
  if (text === "" || /^[-–—−]$/.test(text)) return { kind: "empty" };
  if (/^\d+$/.test(text)) return { kind: "number", value: Number(text) };
  return { kind: "check" };
}

// 지난 분기 기준표 엑셀(바이트)을 읽어 부처별 숫자를 돌려준다.
export async function readReport(data: ArrayBuffer | Uint8Array): Promise<PreviousReport> {
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    throw new ReportReadError(`파일이 너무 커요. ${MAX_UPLOAD_MB}MB 이하만 올릴 수 있어요.`);
  }

  // 보안: 엑셀 도구로 열기 전에, 풀었을 때 엄청나게 커지는 "압축 폭탄"인지 먼저 확인한다.
  try {
    const zip = await JSZip.loadAsync(data);
    assertEntryCount(zip, MAX_ZIP_ENTRIES);
    assertTotalSize(zip, MAX_XLSX_TOTAL_BYTES);
  } catch (error) {
    if (error instanceof ZipGuardError) throw new ReportReadError(error.message);
    throw new ReportReadError("엑셀 파일을 열 수 없어요. 손상되었거나 .xlsx 파일이 아니에요.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as ArrayBuffer);
  } catch {
    throw new ReportReadError("엑셀 파일을 열 수 없어요. 손상되었거나 .xlsx 파일이 아니에요.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ReportReadError("엑셀 파일에 시트가 없어요.");
  if (sheet.rowCount > MAX_REPORT_ROWS) {
    throw new ReportReadError("엑셀 표가 너무 커서 열지 않았어요.");
  }

  // 5개 구분 제목이 모두 있는 줄을 찾는다.
  let headerRow = -1;
  const columnOf = new Map<Category, number>();
  for (let r = 1; r <= sheet.rowCount && headerRow === -1; r++) {
    const found = new Map<Category, number>();
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
      const category = CATEGORY_BY_LABEL.get(normalize(cellText(cell)));
      if (category) found.set(category, col);
    });
    if (found.size === CATEGORIES.length) {
      headerRow = r;
      found.forEach((col, category) => columnOf.set(category, col));
    }
  }
  if (headerRow === -1) {
    throw new ReportReadError(
      "기준표 머리글(신규 지정, 1차 연장, 2차 연장, 지정취소, 규격추가)을 찾지 못했어요. 이 앱이 만든 기준표인지 확인해 주세요.",
    );
  }

  // 부처 이름 칸은 첫 구분 열의 바로 왼쪽이다.
  const nameCol = Math.min(...columnOf.values()) - 1;
  if (nameCol < 1) {
    throw new ReportReadError("기준표에서 부처 이름 칸을 찾지 못했어요.");
  }

  const rows: PreviousReport["rows"] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = cellText(row.getCell(nameCol)).trim();
    if (name === "") continue;
    if (normalize(name) === "계") break; // 맨 아래 계 줄에서 끝낸다 (계는 다시 계산한다)

    const cells = {} as Record<Category, Cell>;
    for (const category of CATEGORIES) {
      cells[category] = toCell(row.getCell(columnOf.get(category)!));
    }
    // 보안: 부처 이름에 쓸 수 없는 글자(=, +, @ 등)가 있으면 이 표는 비교에 쓰지 않는다.
    const ministry = toShortMinistryName(name);
    if (!isSafeMinistryName(ministry)) {
      throw new ReportReadError(
        "지난 분기 표의 부처 이름에 쓸 수 없는 글자(=, +, @ 등)가 있어요. 이 앱이 만든 기준표인지 확인해 주세요.",
      );
    }
    rows.push({ ministry, cells });
  }

  return { rows };
}
