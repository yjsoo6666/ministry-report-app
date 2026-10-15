"use client";

// Design Ref: §4 ⑥ 내려받기 — 기준표 엑셀을 만들어 내려받는다.
// Plan SC: 작업 11번. 확인할 것이 남아 있으면 내려받기 전에 먼저 경고한다.

import { useState } from "react";
import type { Table } from "@/lib/types";

interface Props {
  table: Table;
  // "확인 필요" 칸이 있거나 확인 목록에 파일이 있는지
  hasProblems: boolean;
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function DownloadButtons({ table, hasProblems }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const empty = table.rows.length === 0;

  async function download() {
    if (
      hasProblems &&
      !window.confirm(
        "확인이 필요한 칸이나 파일이 남아 있어요. 그래도 엑셀 파일을 내려받을까요?",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      // 엑셀 도구는 용량이 커서 버튼을 눌렀을 때만 불러온다.
      const { writeReport } = await import("@/lib/excel/writeReport");
      const bytes = await writeReport(table);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_TYPE }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "기준표.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("엑셀 파일을 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="내려받기" className="w-full">
      <button
        type="button"
        onClick={download}
        disabled={empty || busy}
        className="rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "만드는 중…" : "기준표 엑셀 내려받기"}
      </button>
      {empty && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          표에 부처가 있어야 내려받을 수 있어요.
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
