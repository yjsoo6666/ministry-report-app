"use client";

// 1단계: 한글 파일 올리기 (+ 선택: 지난 차수 기준표 올리기). 파일은 올리는 즉시 브라우저 안에서 읽는다.
// Design Ref: §4 ② 파일 올리기 — 끌어다 놓거나 눌러서 고르고, 올린 파일 목록에서 하나씩 또는 전부 뺀다.

import { useRef, useState } from "react";
import type { RoundLabels } from "@/lib/table/roundLabels";

export interface UploadItem {
  id: number;
  name: string;
  size: number;
  status: "reading" | "done";
}

interface Props {
  items: UploadItem[];
  onAdd: (added: File[]) => void;
  onRemove: (id: number) => void;
  onClearAll: () => void;
  onNext: () => void;
  // 지난 차수 표
  previous: { name: string; ministryCount: number } | null;
  previousError: string;
  round: string;
  labels: RoundLabels;
  onRoundChange: (round: string) => void;
  onSelectPrevious: (file: File) => void;
  onClearPrevious: () => void;
}

const ACCEPTED = /\.(hwpx|hwp)$/i;
const SHOWN = 4; // 처음에 보여줄 파일 수

function sizeText(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export default function StepUpload({
  items,
  onAdd,
  onRemove,
  onClearAll,
  onNext,
  previous,
  previousError,
  round,
  labels,
  onRoundChange,
  onSelectPrevious,
  onClearPrevious,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const previousInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(false);

  function handle(list: FileList | null) {
    if (!list) return;
    const all = Array.from(list);
    const accepted = all.filter((f) => ACCEPTED.test(f.name));
    const rejected = all.length - accepted.length;
    setNotice(
      rejected > 0 ? `한글 파일(.hwpx)만 올릴 수 있어요. ${rejected}개는 건너뛰었어요.` : "",
    );
    if (accepted.length > 0) onAdd(accepted);
  }

  const reading = items.filter((i) => i.status === "reading").length;
  const shown = expanded ? items : items.slice(0, SHOWN);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold leading-snug">
          부처에서 받은 한글파일을
          <br />
          올려주세요
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          신규지정, 연장, 지정취소, 규격추가 건수를 읽어서 표로 만들어드려요.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files);
        }}
        className={`rounded-2xl border bg-white p-6 text-center transition-colors dark:bg-zinc-950 ${
          dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mx-auto flex w-full flex-col items-center gap-2"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-semibold">파일을 여기로 끌어오세요</span>
          <span className="text-xs text-zinc-500">또는 눌러서 선택 · hwpx 여러 개 가능</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".hwpx,.hwp"
          className="sr-only"
          aria-label="한글 파일 선택"
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-3 text-xs text-zinc-500">
          파일은 이 컴퓨터의 브라우저 안에서만 읽고, 어디로도 보내지 않아요.
        </p>
      </div>

      {notice && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {notice}
        </p>
      )}

      {items.length > 0 && (
        <section
          aria-label="올린 파일"
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">올린 파일 {items.length}개</h2>
            <button type="button" onClick={onClearAll} className="text-xs text-zinc-500 hover:text-red-600">
              전체 삭제
            </button>
          </div>
          <ul className="flex flex-col">
            {shown.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {sizeText(item.size)}
                    {item.status === "reading" ? " · 읽는 중…" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="shrink-0 px-2 text-lg leading-none text-zinc-400 hover:text-red-600"
                  aria-label={`${item.name} 빼기`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {items.length > SHOWN && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 w-full rounded-lg bg-slate-100 py-2 text-xs font-medium hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              {expanded ? "접기" : `${items.length - SHOWN}개 더보기`}
            </button>
          )}
        </section>
      )}

      <section
        aria-labelledby="previous-title"
        className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          선택
        </span>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 id="previous-title" className="font-bold">
              {labels.previous} 기준표 있나요?
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              올리면 {labels.previous}와 비교한 표도 만들어드려요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => previousInput.current?.click()}
            className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            엑셀 올리기
          </button>
          <input
            ref={previousInput}
            type="file"
            accept=".xlsx"
            className="sr-only"
            aria-label={`${labels.previous} 기준표 선택`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelectPrevious(file);
              e.target.value = "";
            }}
          />
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          이번 조달심 차수
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={round}
            onChange={(e) => onRoundChange(e.target.value.replace(/\D/g, ""))}
            placeholder="4"
            className="w-12 rounded border border-zinc-300 px-2 py-1 text-center text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          차
          {!labels.named && round !== "" && <span>(2 이상의 숫자로 적어 주세요)</span>}
        </label>

        {previous && (
          <p className="mt-2 flex items-center gap-2 text-xs">
            <span className="min-w-0 truncate">
              {previous.name} · 부처 {previous.ministryCount}곳
            </span>
            <button
              type="button"
              onClick={onClearPrevious}
              className="shrink-0 text-zinc-500 hover:text-red-600"
              aria-label={`${labels.previous} 표 빼기`}
            >
              빼기
            </button>
          </p>
        )}
        {previousError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {previousError}
          </p>
        )}
      </section>

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-white via-white to-transparent pb-2 pt-4 dark:from-zinc-950 dark:via-zinc-950">
        <button
          type="button"
          onClick={onNext}
          disabled={items.length === 0 || reading > 0}
          className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
        >
          {reading > 0
            ? `읽는 중… (${items.length - reading}/${items.length})`
            : items.length === 0
              ? "파일을 올려 주세요"
              : `${items.length}개 파일 읽기`}
        </button>
      </div>
    </div>
  );
}
