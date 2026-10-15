"use client";

// Design Ref: §4 ④ 미리보기 표 — 가로 5구분, 세로 부처, 맨 아래 "계". 칸을 눌러 숫자를 고친다.
// Plan SC: 작업 9·10번. 빈칸은 비워 두고, "확인 필요"와 고친 칸은 색으로 구분한다. "계" 행은 고칠 수 없다.

import { useState } from "react";
import { parseCellInput } from "@/lib/table/editTable";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Cell, type Table } from "@/lib/types";

interface Props {
  table: Table;
  onEdit: (ministry: string, category: Category, cell: Cell) => void;
}

function cellText(cell: Cell): string {
  if (cell.kind === "number") return String(cell.value);
  if (cell.kind === "check") return "확인 필요";
  return "";
}

const BASE = "border border-zinc-400 px-2 py-1.5 text-center align-middle dark:border-zinc-600";

export default function PreviewTable({ table, onEdit }: Props) {
  const [editing, setEditing] = useState<{ ministry: string; category: Category } | null>(null);
  const [error, setError] = useState("");

  function commit(ministry: string, category: Category, text: string) {
    const cell = parseCellInput(text);
    if (cell === null) {
      setError("숫자만 입력할 수 있어요. 비워 두면 빈칸이 돼요.");
    } else {
      setError("");
      onEdit(ministry, category, cell);
    }
    setEditing(null);
  }

  return (
    <section aria-labelledby="table-title" className="w-full">
      <h2 id="table-title" className="mb-1 text-xl font-semibold">
        미리보기
      </h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        칸을 누르면 숫자를 고칠 수 있어요. 고친 칸은 파란색, 확인 필요 칸은 주황색이에요.
      </p>

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="bg-purple-200 text-zinc-900 dark:bg-purple-900 dark:text-zinc-50">
              <th className={BASE} scope="col">
                <span className="sr-only">부처</span>
              </th>
              {CATEGORIES.map((category) => (
                <th key={category} className={BASE} scope="col">
                  {CATEGORY_LABELS[category]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.ministry}>
                <th className={`${BASE} font-semibold`} scope="row">
                  {row.ministry}
                </th>
                {CATEGORIES.map((category) => {
                  const cell = row.cells[category];
                  const isEditing =
                    editing?.ministry === row.ministry && editing.category === category;
                  const tone =
                    cell.kind === "check"
                      ? "bg-orange-200 font-semibold text-orange-900 dark:bg-orange-900 dark:text-orange-100"
                      : row.edited[category]
                        ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                        : "";
                  return (
                    <td key={category} className={`${BASE} p-0 ${tone}`}>
                      {isEditing ? (
                        <input
                          autoFocus
                          inputMode="numeric"
                          defaultValue={cell.kind === "number" ? String(cell.value) : ""}
                          aria-label={`${row.ministry} ${CATEGORY_LABELS[category]} 숫자 입력`}
                          className="w-full bg-white px-2 py-1.5 text-center text-zinc-900 outline-2 outline-blue-500"
                          onBlur={(e) => commit(row.ministry, category, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setEditing({ ministry: row.ministry, category });
                          }}
                          aria-label={`${row.ministry} ${CATEGORY_LABELS[category]} ${
                            cellText(cell) || "빈칸"
                          } 수정`}
                          className="block h-full min-h-8 w-full px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          {cellText(cell)}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-200 font-semibold text-zinc-900 dark:bg-green-900 dark:text-zinc-50">
              <th className={BASE} scope="row">
                계
              </th>
              {CATEGORIES.map((category) => (
                <td
                  key={category}
                  className={`${BASE} ${
                    table.totals[category].kind === "check"
                      ? "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
                      : ""
                  }`}
                >
                  {cellText(table.totals[category])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
