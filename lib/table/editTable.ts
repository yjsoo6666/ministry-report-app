// Design Ref: §4 ④ 미리보기·수정 — 담당자가 칸을 고치면 표를 새로 만들고 "계"를 다시 계산한다.
// Plan SC: 작업 10번. 빈칸에 숫자 입력, 숫자를 지워 빈칸으로 되돌리기, 계 행은 직접 수정 불가.

import type { Category, Cell, Table } from "../types";
import { computeTotals } from "./buildTable";

// 담당자가 입력한 글자를 칸 값으로 바꾼다.
// - 빈 글자(공백만 포함)는 빈칸으로 되돌린다.
// - 0 이상의 정수만 숫자로 인정한다.
// - 그 밖의 글자(문자, 소수, 음수)는 null을 돌려줘서 입력을 받아들이지 않는다.
export function parseCellInput(text: string): Cell | null {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "empty" };
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (Number.isSafeInteger(value)) return { kind: "number", value };
  }
  return null;
}

function sameCell(a: Cell, b: Cell): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === "number" && b.kind === "number" ? a.value === b.value : true;
}

// 한 칸을 고친 새 표를 돌려준다. (원래 표는 바꾸지 않는다)
// - 값이 그대로면 아무것도 바꾸지 않는다. (고친 칸 표시도 붙이지 않는다)
// - 고친 칸은 edited로 표시하고, 계는 다시 계산한다.
export function applyEdit(
  table: Table,
  ministry: string,
  category: Category,
  cell: Cell,
): Table {
  const index = table.rows.findIndex((row) => row.ministry === ministry);
  if (index === -1) return table;

  const target = table.rows[index];
  if (sameCell(target.cells[category], cell)) return table;

  const rows = table.rows.map((row, i) =>
    i === index
      ? {
          ...row,
          cells: { ...row.cells, [category]: cell },
          edited: { ...row.edited, [category]: true },
        }
      : row,
  );
  return { rows, totals: computeTotals(rows) };
}
