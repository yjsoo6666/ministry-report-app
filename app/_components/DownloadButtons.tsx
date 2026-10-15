"use client";

// Design Ref: §4 ⑥ 내려받기 — 기준표 엑셀(그리고 지난 차수 표가 있으면 비교표 엑셀)을 만들어 내려받는다.
// Plan SC: 작업 11·15번. 확인할 것이 남아 있으면 내려받기 전에 먼저 경고한다.

import { useState } from "react";
import type { RoundLabels } from "@/lib/table/roundLabels";
import type { PreviousReport, Table } from "@/lib/types";

interface Props {
  table: Table;
  // 지난 차수 기준표를 올렸으면 그 내용 (없으면 null)
  previous: PreviousReport | null;
  // 이번·지난 차수 이름 (예: 4차/3차). 엑셀 파일 이름과 버튼 글자에 쓴다.
  labels: RoundLabels;
  // "확인 필요" 칸이 있거나 확인 목록에 파일이 있는지
  hasProblems: boolean;
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function save(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DownloadButtons({ table, previous, labels, hasProblems }: Props) {
  const prefix = labels.named ? `${labels.current} ` : "";
  const [busy, setBusy] = useState<"report" | "comparison" | null>(null);
  const [error, setError] = useState("");
  const empty = table.rows.length === 0;

  async function download(kind: "report" | "comparison") {
    if (
      hasProblems &&
      !window.confirm("확인이 필요한 칸이나 파일이 남아 있어요. 그래도 엑셀 파일을 내려받을까요?")
    ) {
      return;
    }

    setBusy(kind);
    setError("");
    try {
      // 엑셀 도구는 용량이 커서 버튼을 눌렀을 때만 불러온다.
      if (kind === "report") {
        const { writeReport } = await import("@/lib/excel/writeReport");
        save(await writeReport(table), `${prefix}기준표.xlsx`);
      } else if (previous) {
        const [{ compareTables }, { writeComparison }] = await Promise.all([
          import("@/lib/table/compareTables"),
          import("@/lib/excel/writeComparison"),
        ]);
        save(
          await writeComparison(compareTables(table, previous), labels.current),
          `${prefix}비교표.xlsx`,
        );
      }
    } catch {
      setError("엑셀 파일을 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="내려받기" className="w-full">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => download("report")}
          disabled={empty || busy !== null}
          className="rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "report" ? "만드는 중…" : `${prefix}기준표 엑셀 내려받기`}
        </button>
        <button
          type="button"
          onClick={() => download("comparison")}
          disabled={empty || previous === null || busy !== null}
          className="rounded-full border border-green-700 px-6 py-3 font-semibold text-green-800 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-300 dark:hover:bg-green-950"
        >
          {busy === "comparison" ? "만드는 중…" : `${prefix}비교표 엑셀 내려받기`}
        </button>
      </div>
      {empty && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          표에 부처가 있어야 내려받을 수 있어요.
        </p>
      )}
      {!empty && previous === null && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          비교표는 위에서 {labels.previous} 기준표를 올리면 받을 수 있어요.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
