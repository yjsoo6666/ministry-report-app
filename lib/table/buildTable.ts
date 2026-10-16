// Design Ref: §5 ③ 합치기 — 파일별 결과를 부처×구분 표로 합치고 맨 아래 "계" 행을 만든다.
// Plan SC: 작업 6번. 숫자 100% 일치가 목표라서 문서에 적힌 숫자만 쓰고, 읽지 못했으면 "확인 필요"로 둔다.
// 같은 구분 파일이 여러 개면(유형1, 유형2 등) 숫자를 더한다.

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
  // 이 문제가 걸려 있는 표의 칸. 담당자가 그 칸을 고치면 해결된 것으로 본다.
  cell: { ministry: string; category: Category };
  // 문서의 번호 목록을 세어 본 건수 제안. 칸에 자동으로 넣지 않고 담당자가 맞는지 확인한다.
  suggestion?: { value: number; reason: string };
}

export interface BuildResult {
  table: Table;
  // 부처명 또는 구분을 못 읽어서 표에 넣지 않은 파일 (확인 목록에 보여준다)
  excluded: ParsedFile[];
  // 표에는 넣었지만 확인이 필요한 문제 (예: 숫자를 못 읽음, 같은 파일을 복사해서 올림)
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

// 같은 구분 파일 여러 개의 칸 값을 더한다. (예: 신규지정 유형1 80건 + 유형2 12건 = 92건)
// - 숫자만 있으면 합, 하나라도 "확인 필요"면 "확인 필요", 숫자가 하나도 없으면 빈칸이다.
function sumCells(cells: Cell[]): Cell {
  if (cells.some((c) => c.kind === "check")) return { kind: "check" };
  const numbers = cells.filter((c): c is Extract<Cell, { kind: "number" }> => c.kind === "number");
  if (numbers.length === 0) return { kind: "empty" };
  return { kind: "number", value: numbers.reduce((sum, c) => sum + c.value, 0) };
}

// 파일 이름 끝의 복사본 표시를 뗀 이름. 예: "결과(1).hwpx", "결과 (2).hwpx" → "결과.hwpx"
function withoutCopyMark(fileName: string): string {
  return fileName.replace(/\s?\(\d+\)(\.[^.]*)?$/, "$1");
}

// 같은 그룹의 다른 파일을 복사한 파일인가? (이름이 복사본 모양이고, 원본 이름과 숫자가 같을 때만)
function isCopyOfAnother(file: ParsedFile, group: ParsedFile[]): boolean {
  const base = withoutCopyMark(file.fileName);
  if (base === file.fileName) return false;
  return group.some(
    (other) =>
      other !== file &&
      other.fileName === base &&
      other.count.kind === file.count.kind &&
      (other.count.kind !== "number" ||
        (file.count.kind === "number" && other.count.value === file.count.value)),
  );
}

// 파일별 읽은 결과를 부처별·구분별 표로 합친다.
// - 부처 행은 파일을 올린 순서(처음 나온 순서)대로 둔다. 같은 이름의 부처는 한 행으로 합친다.
// - 같은 부처·같은 구분의 파일이 둘 이상이면(예: 유형1, 유형2) 숫자를 더한다. 복사해서 다시 올린 파일은 한 번만 센다.
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
      const only = group[0];
      row.cells[category] = only.count;
      // 숫자를 읽지 못해 "확인 필요"가 된 칸, 또는 건수 문구를 못 찾아 빈칸이 된 칸은
      // 이유를 확인 목록에도 남긴다. (빈칸이라도 놓친 것이 없는지 담당자가 볼 수 있게)
      if (only.count.kind === "check" || (only.count.kind === "empty" && only.problem)) {
        issues.push({
          fileNames: [only.fileName],
          message: only.problem ?? `${ministry}의 ${category} 칸의 숫자를 읽지 못했어요.`,
          cell: { ministry, category },
          suggestion: only.suggestion,
        });
      }
    } else {
      // 같은 파일을 복사해서 다시 올린 것(예: 결과.hwpx와 결과(1).hwpx, 숫자도 같음)은 한 번만 센다.
      const copies = group.filter((f) => isCopyOfAnother(f, group));
      const counted = group.filter((f) => !copies.includes(f));
      if (copies.length > 0) {
        issues.push({
          fileNames: copies.map((f) => f.fileName),
          message: `${ministry}의 ${category}에 같은 파일을 복사해서 올린 것 같아 한 번만 셌어요. 서로 다른 문서라면 하나를 빼고 다시 올려 주세요.`,
          cell: { ministry, category },
        });
      }
      // 서로 다른 파일(예: 유형1, 유형2)은 숫자를 더한다.
      row.cells[category] = sumCells(counted.map((f) => f.count));
      for (const f of counted) {
        if (f.count.kind === "check" || (f.count.kind === "empty" && f.problem)) {
          issues.push({
            fileNames: [f.fileName],
            message: f.problem ?? `${ministry}의 ${category} 칸의 숫자를 읽지 못했어요.`,
            cell: { ministry, category },
          });
        }
      }
    }
  }

  const rows = [...rowsByMinistry.values()];
  return {
    table: { rows, totals: computeTotals(rows) },
    excluded,
    issues,
  };
}
