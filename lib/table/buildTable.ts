// Design Ref: §5 ③ 합치기 — 파일별 결과를 부처×구분 표로 합치고 맨 아래 "계" 행을 만든다.
// Plan SC: 작업 6번. 숫자 100% 일치가 목표라서 임의로 고르거나 더하지 않고, 애매하면 "확인 필요"로 둔다.

import {
  CATEGORIES,
  type Category,
  type Cell,
  type ParsedFile,
  type Table,
  type TableRow,
} from "../types";

// 확인 목록에 보여줄 문제 (파일 이름들과 설명)
export interface BuildIssue {
  fileNames: string[];
  message: string;
}

export interface BuildResult {
  table: Table;
  // 부처명 또는 구분을 못 읽어서 표에 넣지 않은 파일 (확인 목록에 보여준다)
  excluded: ParsedFile[];
  // 표에는 넣었지만 확인이 필요한 문제 (예: 같은 부처·구분 파일이 둘 이상)
  issues: BuildIssue[];
}

function emptyCells(): Record<Category, Cell> {
  const cells = {} as Record<Category, Cell>;
  for (const category of CATEGORIES) {
    cells[category] = { kind: "empty" };
  }
  return cells;
}

// 맨 아래 "계" 행을 구분별로 계산한다. (담당자가 칸을 고친 뒤 다시 계산할 때도 쓴다)
// - 숫자만 더한다. 숫자가 하나도 없으면 0이다.
// - 그 구분에 "확인 필요" 칸이 하나라도 있으면 계도 "확인 필요"다.
export function computeTotals(rows: TableRow[]): Record<Category, Cell> {
  const totals = {} as Record<Category, Cell>;
  for (const category of CATEGORIES) {
    let sum = 0;
    let hasCheck = false;
    for (const row of rows) {
      const cell = row.cells[category];
      if (cell.kind === "check") {
        hasCheck = true;
      } else if (cell.kind === "number") {
        sum += cell.value;
      }
    }
    totals[category] = hasCheck ? { kind: "check" } : { kind: "number", value: sum };
  }
  return totals;
}

// 파일별 읽은 결과를 부처별·구분별 표로 합친다.
// - 부처 행은 파일을 올린 순서(처음 나온 순서)대로 둔다. 같은 이름의 부처는 한 행으로 합친다.
// - 같은 부처·같은 구분의 파일이 둘 이상이면 합치지 않고 "확인 필요"로 두고 이유를 issues에 적는다.
// - 파일이 없는 칸은 빈칸이다.
export function buildTable(files: ParsedFile[]): BuildResult {
  const excluded: ParsedFile[] = [];
  const issues: BuildIssue[] = [];
  const rowsByMinistry = new Map<string, TableRow>();
  const filesByCell = new Map<string, ParsedFile[]>();

  for (const file of files) {
    if (file.ministry === null || file.category === null) {
      excluded.push(file);
      continue;
    }

    if (!rowsByMinistry.has(file.ministry)) {
      rowsByMinistry.set(file.ministry, {
        ministry: file.ministry,
        cells: emptyCells(),
        edited: {},
      });
    }

    const key = `${file.ministry}\u0000${file.category}`;
    const group = filesByCell.get(key);
    if (group) {
      group.push(file);
    } else {
      filesByCell.set(key, [file]);
    }
  }

  for (const [key, group] of filesByCell) {
    const [ministry, category] = key.split("\u0000") as [string, Category];
    const row = rowsByMinistry.get(ministry);
    if (!row) continue;

    if (group.length === 1) {
      row.cells[category] = group[0].count;
    } else {
      row.cells[category] = { kind: "check" };
      issues.push({
        fileNames: group.map((f) => f.fileName),
        message: `${ministry}의 ${category} 파일이 ${group.length}개 올라와서 확인이 필요해요. 하나만 남겨 주세요.`,
      });
    }
  }

  const rows = [...rowsByMinistry.values()];
  return {
    table: { rows, totals: computeTotals(rows) },
    excluded,
    issues,
  };
}
