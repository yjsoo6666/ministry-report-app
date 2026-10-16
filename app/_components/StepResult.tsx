"use client";

// 3단계: 완성된 표를 보여 주고(지난 차수 표가 있으면 증감도), 엑셀 한 파일로 내려받는다.
// 지난 표와 이름이 안 맞는 부처는 짐작하지 않고 "같은 부처인가요?"라고 담당자에게 묻는다.

import { useState } from "react";
import { comparisonRowLabel, type ComparisonCell, type ComparisonTable } from "@/lib/table/compareTables";
import type { UnmatchedMinistries } from "@/lib/table/matchMinistries";
import type { RoundLabels } from "@/lib/table/roundLabels";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Cell, type Table } from "@/lib/types";

interface Props {
  table: Table;
  comparison: ComparisonTable | null; // 지난 차수 표를 올렸을 때만
  labels: RoundLabels;
  fileName: string;
  unmatched: UnmatchedMinistries | null;
  renames: Record<string, string>; // { 이번 이름: 지난 표 이름 }
  onRename: (current: string, previousName: string) => void;
  onUndoRename: (current: string) => void;
  busy: boolean;
  error: string;
  onDownload: () => void;
  onRestart: () => void;
}

const CARD =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";
const BTN =
  "rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700";
const SHOWN_ROWS = 4;

// 증감 표시: 늘면 빨간 ▲, 줄면 파란 ▼, 같으면 표시 없음
function Diff({ diff }: { diff: number | null }) {
  if (diff === null || diff === 0) return null;
  return diff > 0 ? (
    <span className="ml-1 text-xs text-red-600">▲{diff}</span>
  ) : (
    <span className="ml-1 text-xs text-blue-600">▼{-diff}</span>
  );
}

function cellView(cell: ComparisonCell) {
  if (cell.kind === "empty") return <span className="text-zinc-300">·</span>;
  if (cell.kind === "check") return <span className="text-orange-600">확인 필요</span>;
  return (
    <>
      {cell.current}
      <Diff diff={cell.diff} />
    </>
  );
}

function summaryText(cell: ComparisonCell, previous: string, hasPrevious: boolean): string {
  if (!hasPrevious) return "";
  if (cell.kind === "check") return "비교할 수 없어요";
  if (cell.kind === "empty") return "";
  if (cell.diff === null || cell.diff === 0) return `${previous}과 같아요`;
  return `${previous}보다 ${Math.abs(cell.diff)}건 ${cell.diff > 0 ? "▲" : "▼"}`;
}

function totalOf(cell: Cell): string {
  if (cell.kind === "number") return `${cell.value}`;
  if (cell.kind === "check") return "확인 필요";
  return "0";
}

export default function StepResult({
  table,
  comparison,
  labels,
  fileName,
  unmatched,
  renames,
  onRename,
  onUndoRename,
  busy,
  error,
  onDownload,
  onRestart,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [declined, setDeclined] = useState<string[]>([]);
  const hasPrevious = comparison !== null;

  // 비교가 없으면 이번 표만 보여 준다.
  const rows = comparison
    ? comparison.rows.map((row) => ({ key: row.ministry, label: comparisonRowLabel(row, labels.current), cells: row.cells }))
    : table.rows.map((row) => ({
        key: row.ministry,
        label: row.ministry,
        cells: Object.fromEntries(
          CATEGORIES.map((c) => [
            c,
            row.cells[c].kind === "number"
              ? { kind: "value" as const, current: (row.cells[c] as { value: number }).value, diff: null }
              : row.cells[c].kind === "check"
                ? { kind: "check" as const }
                : { kind: "empty" as const },
          ]),
        ) as Record<Category, ComparisonCell>,
      }));
  const shownRows = expanded ? rows : rows.slice(0, SHOWN_ROWS);

  const asks =
    unmatched && unmatched.previousOnly.length > 0
      ? unmatched.currentOnly.filter((name) => !declined.includes(name))
      : [];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="text-2xl font-bold leading-snug">
          표가 완성됐어요
          {hasPrevious && (
            <>
              <br />
              {labels.previous}랑 비교한 표도 만들었어요
            </>
          )}
        </h1>
      </div>

      <div className={`${CARD} flex items-center gap-3`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950">
          ▦
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{fileName}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-zinc-800">시트 1 · 기준표</span>
            {hasPrevious && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-zinc-800">
                시트 2 · {labels.named ? `${labels.previous} 대비 비교표` : "비교표"}
              </span>
            )}
          </p>
        </div>
      </div>

      {Object.entries(renames).map(([current, old]) => (
        <p key={current} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            &lsquo;{current}&rsquo;는 {labels.previous}의 &lsquo;{old}&rsquo;와 같은 부처로 비교했어요.
          </span>
          <button type="button" onClick={() => onUndoRename(current)} className="underline">
            되돌리기
          </button>
        </p>
      ))}

      {asks.map((name) => (
        <section key={name} className={CARD} aria-label={`${name} 부처 확인`}>
          <p className="font-bold leading-snug">
            &lsquo;{name}&rsquo;는 {labels.previous} 표의 다른 이름과 같은 부처인가요?
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            이름이 바뀐 부처는 같다고 알려 주면 증감을 이어서 비교해요.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {unmatched!.previousOnly.map((old) => (
              <button key={old} type="button" onClick={() => onRename(name, old)} className={BTN}>
                &lsquo;{old}&rsquo;와 같은 부처예요
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDeclined((list) => [...list, name])}
              className={BTN}
            >
              새 부처예요
            </button>
          </div>
        </section>
      ))}

      <section className={CARD} aria-label={hasPrevious ? `${labels.previous} 비교` : "구분별 합계"}>
        <h2 className="mb-3 font-bold">{hasPrevious ? `${labels.previous}랑 비교하면` : "구분별 합계"}</h2>
        <ul className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((category) => {
            const cmp: ComparisonCell = comparison
              ? comparison.totals[category]
              : { kind: "value", current: table.totals[category].kind === "number" ? (table.totals[category] as { value: number }).value : 0, diff: null };
            const sub = summaryText(cmp, labels.previous, hasPrevious);
            const up = cmp.kind === "value" && cmp.diff !== null && cmp.diff > 0;
            return (
              <li key={category} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">{CATEGORY_LABELS[category]}</p>
                <p className="text-2xl font-bold">
                  {totalOf(table.totals[category])}
                  <span className="ml-0.5 text-xs font-normal">건</span>
                </p>
                {sub && <p className={`text-xs ${up ? "text-red-600" : "text-zinc-500"}`}>{sub}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={CARD} aria-label="부처별 표">
        <h2 className="mb-2 font-bold">{hasPrevious ? "부처별 증감" : "부처별 표"}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th scope="col" className="py-1.5 text-left font-normal">
                  부처
                </th>
                {CATEGORIES.map((c) => (
                  <th key={c} scope="col" className="py-1.5 text-right font-normal">
                    {CATEGORY_LABELS[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.map((row) => (
                <tr key={row.key} className="border-t border-zinc-100 dark:border-zinc-900">
                  <th scope="row" className="py-2 text-left font-semibold">
                    {row.label}
                  </th>
                  {CATEGORIES.map((c) => (
                    <td key={c} className="py-2 text-right tabular-nums">
                      {cellView(row.cells[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > SHOWN_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 w-full text-center text-xs text-zinc-500 underline"
          >
            {expanded ? "접기" : `외 ${rows.length - SHOWN_ROWS}개 부처 더 보기`}
          </button>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 mt-auto flex gap-2 bg-gradient-to-t from-white via-white to-transparent pb-2 pt-4 dark:from-zinc-950 dark:via-zinc-950">
        <button type="button" onClick={onRestart} className={`${BTN} px-5`}>
          처음으로
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="flex-1 rounded-xl bg-slate-900 py-3.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {busy ? "만드는 중…" : "엑셀 다운로드"}
        </button>
      </div>
    </div>
  );
}
