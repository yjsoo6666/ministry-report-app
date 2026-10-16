// 지난 차수 표와 이번 표에서 이름이 서로 안 맞는 부처를 찾고, 담당자가 "같은 부처"라고 알려 준 것을 반영한다.
// (예: 정부 조직이 바뀌어 지난 표의 '환경부'가 이번 표의 '기후부'가 된 경우)
// 이름이 비슷한지는 짐작하지 않는다. 같은 부처인지는 담당자가 직접 고른다.

import type { PreviousReport, Table } from "../types";

export interface UnmatchedMinistries {
  currentOnly: string[]; // 이번 표에만 있는 부처
  previousOnly: string[]; // 지난 차수 표에만 있는 부처
}

export function findUnmatched(table: Table, previous: PreviousReport): UnmatchedMinistries {
  const current = new Set(table.rows.map((r) => r.ministry));
  const before = new Set(previous.rows.map((r) => r.ministry));
  return {
    currentOnly: [...current].filter((name) => !before.has(name)),
    previousOnly: [...before].filter((name) => !current.has(name)),
  };
}

// 지난 차수 표의 부처 이름을 담당자가 알려 준 대로 바꾼다. renames: { 이번 이름: 지난 표의 이름 }
export function applyRenames(
  previous: PreviousReport,
  renames: Record<string, string>,
): PreviousReport {
  const toCurrent = new Map(Object.entries(renames).map(([current, old]) => [old, current]));
  return {
    rows: previous.rows.map((row) => ({
      ministry: toCurrent.get(row.ministry) ?? row.ministry,
      cells: row.cells,
    })),
  };
}
