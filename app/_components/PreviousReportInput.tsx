"use client";

// Design Ref: §4 ② 파일 올리기(선택) — 지난 분기 기준표 엑셀을 올리면 비교표를 만들 수 있다.
// Plan SC: 작업 14번. 올린 엑셀은 저장하지 않고, 읽은 숫자만 이 화면에서 잠깐 쓴다.

import { useRef } from "react";

interface Props {
  // 읽은 지난 분기 표 (없으면 null)
  loaded: { name: string; ministryCount: number } | null;
  error: string;
  onSelect: (file: File) => void;
  onClear: () => void;
}

export default function PreviousReportInput({ loaded, error, onSelect, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby="previous-title" className="w-full">
      <h2 id="previous-title" className="mb-1 text-xl font-semibold">
        지난 분기 기준표 <span className="text-sm font-normal text-zinc-500">(선택)</span>
      </h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        이 앱이 만든 지난 분기 기준표(.xlsx)를 올리면, 증감이 들어간 비교표도 내려받을 수 있어요.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-400 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          지난 분기 표 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          aria-label="지난 분기 기준표 선택"
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
              aria-label="지난 분기 표 빼기"
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
