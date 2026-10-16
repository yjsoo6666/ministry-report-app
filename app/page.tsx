"use client";

// Design Ref: §4 화면 구성 — 3단계 흐름: ① 파일 올리기 → ② 확인할 것 정리 → ③ 완성된 표 보고 엑셀 내려받기.
// Plan SC: 작업 8~15번의 화면. 올린 .hwpx 파일은 브라우저 안에서만 읽고, 아무것도 저장하지 않는다.

import { useMemo, useRef, useState } from "react";
import StepResult from "./_components/StepResult";
import StepReview, { issueKey } from "./_components/StepReview";
import StepUpload, { type UploadItem } from "./_components/StepUpload";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/limits";
import { parseFile, tooLargeResult } from "@/lib/parse/parseFile";
import { buildTable } from "@/lib/table/buildTable";
import { compareTables } from "@/lib/table/compareTables";
import { applyEdit } from "@/lib/table/editTable";
import { applyRenames, findUnmatched } from "@/lib/table/matchMinistries";
import { roundLabels } from "@/lib/table/roundLabels";
import { CATEGORIES, type Category, type Cell, type ParsedFile, type PreviousReport } from "@/lib/types";

// 한 번에 동시에 읽을 파일 수
const MAX_PARALLEL_READS = 4;
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface Edit {
  ministry: string;
  category: Category;
  cell: Cell;
}

// 올린 파일 하나와 그 파일에서 읽은 결과
interface Entry {
  id: number;
  name: string;
  size: number;
  status: "reading" | "done";
  results: ParsedFile[];
}

function save(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const nextId = useRef(1);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [previous, setPrevious] = useState<{ name: string; report: PreviousReport } | null>(null);
  const [previousError, setPreviousError] = useState("");
  // 지난 표와 이름이 달라도 같은 부처라고 담당자가 알려 준 것 { 이번 이름: 지난 표 이름 }
  const [renames, setRenames] = useState<Record<string, string>>({});
  // 이번 조달심 차수(예: "4"). 화면과 엑셀 이름에 4차/3차로 쓴다. (저장하지 않는다)
  const [round, setRound] = useState("");
  const labels = roundLabels(round);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // 읽은 결과로 표를 만들고, 담당자가 고친 값을 그 위에 차례로 덧씌운다.
  const parsed = useMemo(
    () => entries.filter((e) => e.status === "done").flatMap((e) => e.results),
    [entries],
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
  // 담당자가 이미 고친 칸이나 "확인했어요"로 정리한 문제는 목록에서 뺀다.
  const openIssues = result.issues.filter((issue) => {
    const row = table.rows.find((r) => r.ministry === issue.cell.ministry);
    return !row?.edited[issue.cell.category] && !dismissed.includes(issueKey(issue));
  });
  const remaining = result.excluded.length + openIssues.length;
  const hasProblems = checkCellCount > 0 || remaining > 0;

  // 지난 표: 담당자가 알려 준 이름 짝을 반영해서 비교한다.
  const mappedPrevious = useMemo(
    () => (previous ? applyRenames(previous.report, renames) : null),
    [previous, renames],
  );
  const comparison = useMemo(
    () => (mappedPrevious ? compareTables(table, mappedPrevious) : null),
    [table, mappedPrevious],
  );
  const unmatched = useMemo(
    () => (mappedPrevious ? findUnmatched(table, mappedPrevious) : null),
    [table, mappedPrevious],
  );

  const items: UploadItem[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    size: entry.size,
    status: entry.status,
  }));
  // 파일이 하나도 없으면 항상 1단계다.
  const shownStep = entries.length === 0 ? 1 : step;

  // 표를 다시 만들면 고친 값이 사라지므로, 고친 값이 있으면 먼저 물어본다.
  function confirmReset(): boolean {
    return (
      edits.length === 0 ||
      window.confirm("표를 다시 만들면 고친 값이 사라져요. 계속할까요?")
    );
  }

  function resetEdits() {
    setEdits([]);
    setDismissed([]);
  }

  function addFiles(files: File[]) {
    if (!confirmReset()) return;
    resetEdits();

    const added: Entry[] = files.map((file) => ({
      id: nextId.current++,
      name: file.name,
      size: file.size,
      status: "reading",
      results: [],
    }));
    setEntries((prev) => [...prev, ...added]);

    // 파일이 많아도(예: 100개) 한 번에 4개씩만 읽어서, 큰 파일이 많을 때 메모리가 한꺼번에 몰리지 않게 한다.
    let next = 0;
    const readNext = async () => {
      while (next < files.length) {
        const index = next++;
        const file = files[index];
        const id = added[index].id;
        let results: ParsedFile[];
        try {
          // 보안: 너무 큰 파일은 메모리에 올리기 전에 크기만 보고 거절한다.
          results =
            file.size > MAX_UPLOAD_BYTES
              ? tooLargeResult(file.name)
              : await parseFile(file.name, await file.arrayBuffer());
        } catch {
          // 파일을 읽는 도중 문제가 생겨도 "읽는 중"으로 남지 않게 이유와 함께 마무리한다.
          results = [
            {
              fileName: file.name,
              ministry: null,
              category: null,
              count: { kind: "empty" },
              problem: "파일을 읽지 못했어요. 다시 올려 주세요.",
            },
          ];
        }
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: "done", results } : e)),
        );
      }
    };
    void Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL_READS, files.length) }, readNext),
    );
  }

  function removeFile(id: number) {
    if (!confirmReset()) return;
    resetEdits();
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function removeFileByName(fileName: string) {
    const entry = entries.find((e) => e.name === fileName);
    if (entry) removeFile(entry.id);
  }

  function clearAll() {
    if (!window.confirm("올린 파일을 모두 지울까요?")) return;
    resetEdits();
    setEntries([]);
    setStep(1);
  }

  function restart() {
    if (!window.confirm("처음부터 다시 시작할까요? 지금 표는 사라져요.")) return;
    resetEdits();
    setEntries([]);
    setPrevious(null);
    setPreviousError("");
    setRenames({});
    setStep(1);
  }

  // 지난 차수 기준표를 읽는다. 엑셀 도구는 용량이 커서 이때 처음 불러온다.
  async function selectPrevious(file: File) {
    setPreviousError("");
    setRenames({});
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
          : `${labels.previous} 기준표를 읽지 못했어요.`,
      );
    }
  }

  function setCell(ministry: string, category: Category, cell: Cell) {
    setEdits((prev) => [...prev, { ministry, category, cell }]);
  }

  function goNext(force: boolean) {
    if (
      force &&
      !window.confirm("확인이 필요한 칸이나 파일이 남아 있어요. 그래도 다음으로 넘어갈까요?")
    ) {
      return;
    }
    setStep(3);
  }

  async function download() {
    setBusy(true);
    setDownloadError("");
    try {
      // 엑셀 도구는 용량이 커서 버튼을 눌렀을 때만 불러온다.
      const { writeWorkbook } = await import("@/lib/excel/writeWorkbook");
      const prefix = labels.named ? `${labels.current} ` : "";
      save(await writeWorkbook(table, comparison, labels), `${prefix}기준표.xlsx`);
    } catch {
      setDownloadError("엑셀 파일을 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const fileName = `${labels.named ? `${labels.current} ` : ""}기준표.xlsx`;

  return (
    <div className="flex flex-1 justify-center bg-zinc-100 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex min-h-screen w-full max-w-xl flex-col bg-white dark:bg-zinc-950">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-slate-50 px-5 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center gap-2 font-semibold">
            {shownStep > 1 && (
              <button
                type="button"
                onClick={() => setStep((shownStep - 1) as 1 | 2)}
                aria-label="이전 단계로"
                className="-ml-1 px-1 text-lg leading-none text-zinc-500 hover:text-zinc-900"
              >
                ‹
              </button>
            )}
            <span aria-hidden="true" className="size-1.5 rounded-full bg-red-600" />
            부처별 기준표 취합
          </span>
          <span className="text-xs text-zinc-500">{shownStep} / 3</span>
        </header>

        <main className="flex flex-1 flex-col px-5 pb-4 pt-8">
          {shownStep === 1 && (
            <StepUpload
              items={items}
              onAdd={addFiles}
              onRemove={removeFile}
              onClearAll={clearAll}
              onNext={() => setStep(2)}
              previous={
                previous ? { name: previous.name, ministryCount: previous.report.rows.length } : null
              }
              previousError={previousError}
              round={round}
              labels={labels}
              onRoundChange={setRound}
              onSelectPrevious={selectPrevious}
              onClearPrevious={() => {
                setPrevious(null);
                setPreviousError("");
                setRenames({});
              }}
            />
          )}
          {shownStep === 2 && (
            <StepReview
              table={table}
              excluded={result.excluded}
              issues={openIssues}
              onSetCell={setCell}
              onDismiss={(key) => setDismissed((prev) => [...prev, key])}
              onRemoveFile={removeFileByName}
              onNext={goNext}
            />
          )}
          {shownStep === 3 && (
            <StepResult
              table={table}
              comparison={comparison}
              labels={labels}
              fileName={fileName}
              unmatched={unmatched}
              renames={renames}
              onRename={(current, old) => setRenames((prev) => ({ ...prev, [current]: old }))}
              onUndoRename={(current) =>
                setRenames((prev) => {
                  const rest = { ...prev };
                  delete rest[current];
                  return rest;
                })
              }
              busy={busy}
              error={downloadError}
              onDownload={download}
              onRestart={restart}
            />
          )}
          {/* 확인이 남은 채 3단계에 왔을 때 알려 준다 */}
          {shownStep === 3 && hasProblems && (
            <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              확인이 필요한 칸이나 파일이 남아 있어요. 엑셀에는 &ldquo;확인 필요&rdquo;로 표시돼요.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
