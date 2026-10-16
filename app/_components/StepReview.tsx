"use client";

// 2단계: 읽은 결과 확인. 확인이 필요한 것만 카드로 보여 주고, 담당자가 숫자를 직접 적거나 빈칸/제외로 정리한다.
// 카드는 숫자를 짐작해서 채우지 않는다. 문서에 적힌 숫자를 담당자가 보고 직접 적는다.

import { useState } from "react";
import PreviewTable from "./PreviewTable";
import type { BuildIssue } from "@/lib/table/buildTable";
import { parseCellInput } from "@/lib/table/editTable";
import { CATEGORY_LABELS, type Category, type Cell, type ParsedFile, type Table } from "@/lib/types";

export function issueKey(issue: BuildIssue): string {
  return `${issue.fileNames.join("|")}|${issue.cell.ministry}|${issue.cell.category}|${issue.message}`;
}

interface Props {
  table: Table;
  excluded: ParsedFile[];
  issues: BuildIssue[]; // 아직 정리하지 않은 문제만
  onSetCell: (ministry: string, category: Category, cell: Cell) => void;
  onDismiss: (key: string) => void;
  onRemoveFile: (fileName: string) => void;
  onNext: (force: boolean) => void;
}

const CARD =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";
const BTN =
  "rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700";

function IssueCard({
  issue,
  cellKind,
  onSetCell,
  onDismiss,
}: {
  issue: BuildIssue;
  // 표에 지금 들어 있는 칸의 상태. 숫자(number)면 이미 값이 있는 칸이라 알림만 확인한다.
  cellKind: Cell["kind"] | undefined;
  onSetCell: Props["onSetCell"];
  onDismiss: Props["onDismiss"];
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  // 제안이 있으면 처음에는 "N건 맞아요" 버튼만 보이고, "직접 적을게요"를 눌러야 입력 칸이 나온다.
  const [typing, setTyping] = useState(false);
  const { ministry, category } = issue.cell;
  const isCheck = cellKind === "check";
  const suggestion = issue.suggestion;
  const showInput = !suggestion || typing;

  function apply() {
    const cell = parseCellInput(text);
    if (cell === null || cell.kind !== "number") {
      setError("숫자만 적어 주세요.");
      return;
    }
    onSetCell(ministry, category, cell);
  }

  return (
    <li className={CARD}>
      <p className="text-xs text-zinc-500">
        {ministry} · {CATEGORY_LABELS[category]}
      </p>
      <p className="mt-0.5 font-bold leading-snug">{issue.message}</p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">{issue.fileNames.join(", ")}</p>
      {suggestion && cellKind !== "number" && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-zinc-900">
          {suggestion.reason} <strong>{suggestion.value}건</strong>이 맞나요?
        </p>
      )}

      {cellKind !== "number" ? (
        <div className="mt-3 flex flex-col gap-2">
          {suggestion && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTyping((v) => !v)}
                className={`${BTN} flex-1`}
              >
                직접 적을게요
              </button>
              <button
                type="button"
                onClick={() => onSetCell(ministry, category, { kind: "number", value: suggestion.value })}
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                {suggestion.value}건 맞아요
              </button>
            </div>
          )}
          {showInput && (
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && text.trim() !== "" && apply()}
                placeholder="문서에 적힌 건수"
                aria-label={`${ministry} ${CATEGORY_LABELS[category]} 건수 입력`}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={apply}
                disabled={text.trim() === ""}
                className={`${BTN} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                이 숫자로 할게요
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              isCheck ? onSetCell(ministry, category, { kind: "empty" }) : onDismiss(issueKey(issue))
            }
            className="self-start text-xs text-zinc-500 underline"
          >
            건수 없음(빈칸)이 맞아요
          </button>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => onDismiss(issueKey(issue))} className={`${BTN} mt-3 w-full`}>
          확인했어요
        </button>
      )}
    </li>
  );
}

export default function StepReview({
  table,
  excluded,
  issues,
  onSetCell,
  onDismiss,
  onRemoveFile,
  onNext,
}: Props) {
  const remaining = excluded.length + issues.length;
  const okMinistries = table.rows.filter((row) =>
    Object.values(row.cells).every((cell) => cell.kind !== "check"),
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold leading-snug">
          {remaining > 0 ? (
            <>
              {okMinistries}개 부처는 다 읽었어요
              <br />
              {remaining}건만 확인해 주세요
            </>
          ) : (
            <>
              {table.rows.length}개 부처를 모두 읽었어요
              <br />
              확인할 게 없어요
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {remaining > 0
            ? "읽지 못한 칸은 문서를 열어 보고 숫자를 직접 적어 주세요."
            : "아래 표를 한 번 훑어보고 다음으로 넘어가세요. 칸을 누르면 숫자를 고칠 수 있어요."}
        </p>
      </div>

      {remaining > 0 && (
        <ul className="flex flex-col gap-3">
          {excluded.map((file, index) => (
            <li key={`${file.fileName}-${index}`} className={CARD}>
              <p className="text-xs text-zinc-500">표에 넣지 못한 파일</p>
              <p className="mt-0.5 font-bold leading-snug">
                {file.problem ?? "부처명이나 구분을 읽지 못했어요."}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{file.fileName}</p>
              <button
                type="button"
                onClick={() => onRemoveFile(file.fileName)}
                className={`${BTN} mt-3 w-full`}
              >
                이 파일 빼기
              </button>
            </li>
          ))}
          {issues.map((issue) => {
            const row = table.rows.find((r) => r.ministry === issue.cell.ministry);
            return (
              <IssueCard
                key={issueKey(issue)}
                issue={issue}
                cellKind={row?.cells[issue.cell.category].kind}
                onSetCell={onSetCell}
                onDismiss={onDismiss}
              />
            );
          })}
        </ul>
      )}

      <PreviewTable table={table} onEdit={onSetCell} />

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-white via-white to-transparent pb-2 pt-4 dark:from-zinc-950 dark:via-zinc-950">
        <button
          type="button"
          onClick={() => onNext(false)}
          disabled={remaining > 0}
          className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
        >
          {remaining > 0 ? `확인 ${remaining}건 남았어요` : "다음"}
        </button>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => onNext(true)}
            className="mt-2 w-full text-center text-xs text-zinc-500 underline"
          >
            확인 없이 넘어갈게요
          </button>
        )}
      </div>
    </div>
  );
}
