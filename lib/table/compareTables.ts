// Design Ref: §5.2 비교표 — 이번 차수 표와 지난 차수 기준표를 칸마다 비교해 증감(+2, -1)을 만든다.
// Plan SC: 작업 15번. 새로 생긴 부처는 "신규", 이번에 파일이 없는 지난 차수 부처는 행을 남긴다.

import {
  CATEGORIES,
  type Category,
  type Cell,
  type PreviousReport,
  type Table,
} from "../types";

// 비교표의 한 칸.
// - empty: 이번에도 지난번에도 건수가 없음
// - check: 어느 한쪽이 "확인 필요"라 증감을 계산할 수 없음
// - value: 이번 차수 숫자와 지난 차수 대비 증감 (diff가 null이면 비교할 지난 차수 부처가 없음)
export type ComparisonCell =
  | { kind: "empty" }
  | { kind: "check" }
  | { kind: "value"; current: number; diff: number | null };

export interface ComparisonRow {
  ministry: string;
  // 같은 부처, 이번에 새로 생긴 부처(new), 지난 차수에는 있었지만 이번에 파일이 없는 부처(missing)
  status: "same" | "new" | "missing";
  cells: Record<Category, ComparisonCell>;
}

export interface ComparisonTable {
  rows: ComparisonRow[];
  totals: Record<Category, ComparisonCell>;
}

const numberOf = (cell: Cell | undefined): number => (cell?.kind === "number" ? cell.value : 0);

// 지난 차수 부처가 같은 이름으로 여러 번 나오면 하나로 합친다. (숫자는 더하고, 확인 필요가 있으면 확인 필요)
function mergePrevious(previous: PreviousReport): Map<string, Record<Category, Cell>> {
  const merged = new Map<string, Record<Category, Cell>>();
  for (const row of previous.rows) {
    const existing = merged.get(row.ministry);
    if (!existing) {
      merged.set(row.ministry, { ...row.cells });
      continue;
    }
    for (const category of CATEGORIES) {
      const a = existing[category];
      const b = row.cells[category];
      if (a.kind === "check" || b.kind === "check") existing[category] = { kind: "check" };
      else if (a.kind === "empty" && b.kind === "empty") existing[category] = { kind: "empty" };
      else existing[category] = { kind: "number", value: numberOf(a) + numberOf(b) };
    }
  }
  return merged;
}

function compareCell(current: Cell, previous: Cell | undefined): ComparisonCell {
  if (current.kind === "check" || previous?.kind === "check") return { kind: "check" };
  if (current.kind === "empty" && previous === undefined) return { kind: "empty" };
  if (current.kind === "empty" && previous?.kind === "empty") return { kind: "empty" };
  if (previous === undefined) {
    return { kind: "value", current: numberOf(current), diff: null };
  }
  return { kind: "value", current: numberOf(current), diff: numberOf(current) - numberOf(previous) };
}

function sumTotals(rows: { cells: Record<Category, Cell> }[]): Record<Category, Cell> {
  const totals = {} as Record<Category, Cell>;
  for (const category of CATEGORIES) {
    let sum = 0;
    let hasCheck = false;
    for (const row of rows) {
      const cell = row.cells[category];
      if (cell.kind === "check") hasCheck = true;
      else sum += numberOf(cell);
    }
    totals[category] = hasCheck ? { kind: "check" } : { kind: "number", value: sum };
  }
  return totals;
}

// 이번 차수 표(담당자가 고친 값 포함)와 지난 차수 기준표를 비교한다.
export function compareTables(current: Table, previous: PreviousReport): ComparisonTable {
  const previousByMinistry = mergePrevious(previous);
  const rows: ComparisonRow[] = [];

  for (const row of current.rows) {
    const prev = previousByMinistry.get(row.ministry);
    const cells = {} as Record<Category, ComparisonCell>;
    for (const category of CATEGORIES) {
      cells[category] = prev
        ? compareCell(row.cells[category], prev[category])
        : compareCell(row.cells[category], undefined);
    }
    rows.push({ ministry: row.ministry, status: prev ? "same" : "new", cells });
  }

  // 지난 차수에는 있었지만 이번에 파일이 없는 부처는 행을 남긴다.
  const currentNames = new Set(current.rows.map((r) => r.ministry));
  for (const [ministry, prev] of previousByMinistry) {
    if (currentNames.has(ministry)) continue;
    const cells = {} as Record<Category, ComparisonCell>;
    for (const category of CATEGORIES) {
      cells[category] = compareCell({ kind: "empty" }, prev[category]);
    }
    rows.push({ ministry, status: "missing", cells });
  }

  // 계 줄: 이번 차수 계와, 지난 차수 기준표를 다시 더한 계를 비교한다.
  const previousTotals = sumTotals([...previousByMinistry.values()].map((cells) => ({ cells })));
  const totals = {} as Record<Category, ComparisonCell>;
  for (const category of CATEGORIES) {
    totals[category] = compareCell(current.totals[category], previousTotals[category]);
  }

  return { rows, totals };
}

// 비교표 칸을 글자로 만든다. 예: "9 (+2)", "4 (-1)", "3 (0)"
export function formatComparisonCell(cell: ComparisonCell): string {
  if (cell.kind === "empty") return "";
  if (cell.kind === "check") return "확인 필요";
  if (cell.diff === null) return String(cell.current);
  if (cell.diff > 0) return `${cell.current} (+${cell.diff})`;
  if (cell.diff < 0) return `${cell.current} (${cell.diff})`;
  return `${cell.current} (0)`;
}

// 비교표의 부처 이름 칸 글자. 새로 생긴 부처와 이번에 파일이 없는 부처는 표시를 붙인다.
// currentLabel은 이번 차수 이름(예: "4차")이다.
export function comparisonRowLabel(row: ComparisonRow, currentLabel = "이번 차수"): string {
  if (row.status === "new") return `${row.ministry} (신규)`;
  if (row.status === "missing") return `${row.ministry} (${currentLabel} 없음)`;
  return row.ministry;
}
