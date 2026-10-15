"use client";

// Design Ref: §4 화면 구성 — 한 페이지에서 올리기 → 요약 → 미리보기·수정 → 확인 목록 → 내려받기.
// Plan SC: 작업 8~11번의 화면. 올린 .hwpx 파일은 브라우저 안에서 읽어 표에 넣는다.

import { useMemo, useRef, useState } from "react";
import { EXAMPLE_FILES } from "./_components/exampleData";
import DownloadButtons from "./_components/DownloadButtons";
import FileDropzone, { type UploadItem } from "./_components/FileDropzone";
import IssueList from "./_components/IssueList";
import PreviewTable from "./_components/PreviewTable";
import PreviousReportInput from "./_components/PreviousReportInput";
import Summary from "./_components/Summary";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/limits";
import { parseFile, tooLargeResult } from "@/lib/parse/parseFile";
import { buildTable } from "@/lib/table/buildTable";
import { applyEdit } from "@/lib/table/editTable";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type Cell,
  type ParsedFile,
  type PreviousReport,
} from "@/lib/types";

interface Edit {
  ministry: string;
  category: Category;
  cell: Cell;
}

// 올린 파일 하나와 그 파일에서 읽은 결과
interface Entry {
  id: number;
  name: string;
  status: "reading" | "done";
  results: ParsedFile[];
}

function countText(cell: Cell): string {
  if (cell.kind === "number") return `${cell.value}건`;
  if (cell.kind === "check") return "확인 필요";
  return "건수 없음";
}

// 파일 하나를 읽은 결과를 한 줄로 요약한다.
function summarize(results: ParsedFile[]): { summary: string; hasProblem: boolean } {
  const parts = results.map((r) => {
    const who = r.ministry ?? "부처명 모름";
    const what = r.category ? CATEGORY_LABELS[r.category] : "구분 모름";
    return r.category ? `${who} · ${what}: ${countText(r.count)}` : `${who} · ${what}`;
  });
  const problems = results.map((r) => r.problem).filter((p): p is string => Boolean(p));
  const hasProblem = results.some(
    (r) => r.ministry === null || r.category === null || r.count.kind === "check" || r.problem,
  );
  return {
    summary: [...parts, ...problems].join(" — "),
    hasProblem,
  };
}

export default function Home() {
  const nextId = useRef(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [exampleOn, setExampleOn] = useState(false);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [previous, setPrevious] = useState<{ name: string; report: PreviousReport } | null>(null);
  const [previousError, setPreviousError] = useState("");

  // 읽은 결과(올린 파일 + 켜져 있다면 예시)로 표를 만들고, 담당자가 고친 값을 그 위에 차례로 덧씌운다.
  const parsed = useMemo(
    () => [
      ...(exampleOn ? EXAMPLE_FILES : []),
      ...entries.filter((e) => e.status === "done").flatMap((e) => e.results),
    ],
    [entries, exampleOn],
  );
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

  const items: UploadItem[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    status: entry.status,
    ...(entry.status === "done" ? summarize(entry.results) : { summary: "", hasProblem: false }),
  }));

  // 표를 다시 만들면 고친 값이 사라지므로, 고친 값이 있으면 먼저 물어본다.
  function confirmReset(): boolean {
    return (
      edits.length === 0 ||
      window.confirm("표를 다시 만들면 고친 값이 사라져요. 계속할까요?")
    );
  }

  function addFiles(files: File[]) {
    if (!confirmReset()) return;
    setEdits([]);
    // 실제 파일을 올리면 가짜 예시 데이터는 자동으로 지운다. (예시 부처가 실제 표에 섞이지 않게)
    setExampleOn(false);

    const added: Entry[] = files.map((file) => ({
      id: nextId.current++,
      name: file.name,
      status: "reading",
      results: [],
    }));
    setEntries((prev) => [...prev, ...added]);

    files.forEach(async (file, index) => {
      const id = added[index].id;
      // 보안: 너무 큰 파일은 메모리에 올리기 전에 크기만 보고 거절한다.
      const results =
        file.size > MAX_UPLOAD_BYTES
          ? tooLargeResult(file.name)
          : await parseFile(file.name, await file.arrayBuffer());
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "done", results } : e)),
      );
    });
  }

  function removeFile(id: number) {
    if (!confirmReset()) return;
    setEdits([]);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // 지난 분기 기준표를 읽는다. 엑셀 도구는 용량이 커서 이때 처음 불러온다.
  async function selectPrevious(file: File) {
    setPreviousError("");
    if (!/\.xlsx$/i.test(file.name)) {
      setPrevious(null);
      setPreviousError("엑셀 파일(.xlsx)만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPrevious(null);
      setPreviousError(`파일이 너무 커요. ${MAX_UPLOAD_MB}MB 이하만 올릴 수 있어요.`);
      return;
    }
    try {
      const { readReport } = await import("@/lib/excel/readReport");
      const report = await readReport(await file.arrayBuffer());
      setPrevious({ name: file.name, report });
    } catch (error) {
      setPrevious(null);
      setPreviousError(
        error instanceof Error && error.message
          ? error.message
          : "지난 분기 기준표를 읽지 못했어요.",
      );
    }
  }

  function toggleExample() {
    if (!confirmReset()) return;
    setEdits([]);
    setExampleOn((on) => !on);
  }

  const hasData = parsed.length > 0;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-4xl flex-col gap-8 bg-white px-6 py-12 dark:bg-zinc-950 sm:px-12">
        <h1 className="text-4xl font-bold tracking-tight">부처별 기준표 자동 취합 앱</h1>

        <FileDropzone items={items} onAdd={addFiles} onRemove={removeFile} />

        <PreviousReportInput
          loaded={
            previous ? { name: previous.name, ministryCount: previous.report.rows.length } : null
          }
          error={previousError}
          onSelect={selectPrevious}
          onClear={() => {
            setPrevious(null);
            setPreviousError("");
          }}
        />

        {/* 실제 파일이 올라와 있는 동안에는 예시 버튼을 숨겨서, 가짜 예시가 실제 표에 섞이지 않게 한다. */}
        {entries.length === 0 && (
          <section aria-label="예시 데이터" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleExample}
              className="rounded-full border border-zinc-400 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {exampleOn ? "예시 지우기" : "예시 데이터로 화면 미리 보기"}
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              파일이 없을 때 화면을 보는 용도예요. 예시는 실제 자료가 아닌 가짜 숫자예요.
            </span>
          </section>
        )}

        {hasData && (
          <>
            <Summary
              fileCount={entries.length + (exampleOn ? EXAMPLE_FILES.length : 0)}
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
            <DownloadButtons
              table={table}
              previous={previous?.report ?? null}
              hasProblems={hasProblems}
            />
          </>
        )}
      </main>
    </div>
  );
}
