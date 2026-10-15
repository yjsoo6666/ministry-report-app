"use client";

// Design Ref: §4 ② 파일 올리기(선택) — 지난 차수(예: 3차) 기준표 엑셀을 올리면 비교표를 만들 수 있다.
// Plan SC: 작업 14번. 올린 엑셀은 저장하지 않고, 읽은 숫자만 이 화면에서 잠깐 쓴다.

import { useRef } from "react";
import type { RoundLabels } from "@/lib/table/roundLabels";

interface Props {
  // 읽은 지난 차수 표 (없으면 null)
  loaded: { name: string; ministryCount: number } | null;
  error: string;
  // 이번 조달심 차수(입력 글자)와 그 차수로 만든 이름(예: 4차/3차)
  round: string;
  labels: RoundLabels;
  onRoundChange: (round: string) => void;
  onSelect: (file: File) => void;
  onClear: () => void;
}

export default function PreviousReportInput({
  loaded,
  error,
  round,
  labels,
  onRoundChange,
  onSelect,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby="previous-title" className="w-full">
      <h2 id="previous-title" className="mb-1 text-xl font-semibold">
        {labels.previous} 기준표 <span className="text-sm font-normal text-zinc-500">(선택)</span>
      </h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        이 앱이 만든 {labels.previous} 기준표(.xlsx)를 올리면, {labels.current}와 비교한 증감이 들어간
        비교표도 내려받을 수 있어요.
      </p>

      <label className="mb-3 flex items-center gap-2 text-sm">
        이번 조달심 차수
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={round}
          onChange={(e) => onRoundChange(e.target.value.replace(/\D/g, ""))}
          placeholder="4"
          className="w-14 rounded border border-zinc-400 px-2 py-1 text-center dark:bg-zinc-900"
        />
        차
        {!labels.named && round !== "" && (
          <span className="text-zinc-500">(2 이상의 숫자로 적어 주세요)</span>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-400 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {labels.previous} 표 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          aria-label={`${labels.previous} 기준표 선택`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
        {loaded && (
          <span className="flex items-center gap-2 text-sm">
            <span>
              {loaded.name} · 부처 {loaded.ministryCount}곳
            </span>
            <button
              type="button"
              onClick={onClear}
              className="text-zinc-500 hover:text-red-600"
              aria-label={`${labels.previous} 표 빼기`}
            >
              빼기
            </button>
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
