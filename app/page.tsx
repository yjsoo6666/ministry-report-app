"use client";

// Design Ref: §4 화면 구성 — 한 페이지에서 올리기 → 요약 → 미리보기·수정 → 확인 목록 → 내려받기.
// Plan SC: 작업 8~11번의 화면. 한글 파일 읽기(작업 3~5번)는 아직 없어서, 예시 데이터로 화면을 미리 볼 수 있다.

import { useMemo, useState } from "react";
import { EXAMPLE_FILES } from "./_components/exampleData";
import DownloadButtons from "./_components/DownloadButtons";
import FileDropzone from "./_components/FileDropzone";
import IssueList from "./_components/IssueList";
import PreviewTable from "./_components/PreviewTable";
import Summary from "./_components/Summary";
import { buildTable } from "@/lib/table/buildTable";
import { applyEdit } from "@/lib/table/editTable";
import { CATEGORIES, type Category, type Cell, type ParsedFile } from "@/lib/types";

interface Edit {
  ministry: string;
  category: Category;
  cell: Cell;
}

export default function Home() {
  const [uploaded, setUploaded] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);

  // 읽은 결과로 표를 만들고, 담당자가 고친 값을 그 위에 차례로 덧씌운다.
  const result = useMemo(() => buildTable(parsed), [parsed]);
  const table = useMemo(
    () =>
      edits.reduce(
        (current, edit) => applyEdit(current, edit.ministry, edit.category, edit.cell),
        result.table,
      ),
    [result.table, edits],
  );

  const checkCellCount = CATEGORIES.reduce(
    (count, category) =>
      count + table.rows.filter((row) => row.cells[category].kind === "check").length,
    0,
  );
  // 담당자가 이미 고친 칸에 걸린 문제는 해결된 것으로 보고 목록에서 뺀다.
  const openIssues = result.issues.filter((issue) => {
    const row = table.rows.find((r) => r.ministry === issue.cell.ministry);
    return !row?.edited[issue.cell.category];
  });
  const problemFileCount = result.excluded.length + openIssues.length;
  const hasProblems = checkCellCount > 0 || problemFileCount > 0;

  function confirmReset(): boolean {
    return (
      edits.length === 0 ||
      window.confirm("표를 다시 만들면 고친 값이 사라져요. 계속할까요?")
    );
  }

  function loadExample() {
    if (!confirmReset()) return;
    setParsed(EXAMPLE_FILES);
    setEdits([]);
  }

  function clearExample() {
    if (!confirmReset()) return;
    setParsed([]);
    setEdits([]);
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-4xl flex-col gap-8 bg-white px-6 py-12 dark:bg-zinc-950 sm:px-12">
        <h1 className="text-4xl font-bold tracking-tight">부처별 기준표 자동 취합 앱</h1>

        <FileDropzone
          files={uploaded}
          onAdd={(added) => setUploaded((prev) => [...prev, ...added])}
          onRemove={(index) => setUploaded((prev) => prev.filter((_, i) => i !== index))}
        />

        <section aria-label="예시 데이터" className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadExample}
            className="rounded-full border border-zinc-400 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            예시 데이터로 화면 미리 보기
          </button>
          {parsed.length > 0 && (
            <button
              type="button"
              onClick={clearExample}
              className="rounded-full border border-zinc-400 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              예시 지우기
            </button>
          )}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            파일 읽기가 아직 없어서, 실제 자료가 아닌 가짜 숫자로 화면을 보여줘요.
          </span>
        </section>

        {parsed.length > 0 && (
          <>
            <Summary
              fileCount={parsed.length}
              ministryCount={table.rows.length}
              checkCellCount={checkCellCount}
              problemFileCount={problemFileCount}
            />
            <PreviewTable
              table={table}
              onEdit={(ministry, category, cell) =>
                setEdits((prev) => [...prev, { ministry, category, cell }])
              }
            />
            <IssueList excluded={result.excluded} issues={openIssues} />
            <DownloadButtons table={table} hasProblems={hasProblems} />
          </>
        )}
      </main>
    </div>
  );
}
