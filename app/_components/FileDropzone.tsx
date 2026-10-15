"use client";

// Design Ref: §4 ② 파일 올리기 — 끌어다 놓거나 버튼으로 한글 파일 여러 개를 고르고, 파일마다 읽은 결과를 보여준다.
// Plan SC: 작업 8번. 올린 파일 목록, 읽는 중/읽은 결과 표시, 빼기.

import { useRef, useState } from "react";

export interface UploadItem {
  id: number;
  name: string;
  status: "reading" | "done";
  // 읽은 결과를 한 줄로 요약한 글 (예: "해수부 · 2차 연장: 1")
  summary: string;
  // 읽지 못했거나 확인이 필요한 파일이면 true
  hasProblem: boolean;
}

interface Props {
  items: UploadItem[];
  onAdd: (added: File[]) => void;
  onRemove: (id: number) => void;
}

const ACCEPTED = /\.(hwpx|hwp)$/i;

export default function FileDropzone({ items, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  function handle(list: FileList | null) {
    if (!list) return;
    const all = Array.from(list);
    const accepted = all.filter((f) => ACCEPTED.test(f.name));
    const rejected = all.length - accepted.length;
    setNotice(
      rejected > 0
        ? `한글 파일(.hwpx, .hwp)만 올릴 수 있어요. ${rejected}개는 건너뛰었어요.`
        : "",
    );
    if (accepted.length > 0) onAdd(accepted);
  }

  return (
    <section aria-labelledby="upload-title" className="w-full">
      <h2 id="upload-title" className="mb-3 text-xl font-semibold">
        파일 올리기
      </h2>

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
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
        }`}
      >
        <p className="text-zinc-700 dark:text-zinc-300">
          한글 파일(.hwpx, .hwp)을 여기에 끌어다 놓거나, 아래 버튼을 눌러 고르세요.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          파일 선택
        </button>
        <input
          ref={inputRef}
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
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          파일은 이 컴퓨터의 브라우저 안에서만 읽고, 어디로도 보내지 않아요.
        </p>
      </div>

      {notice && (
        <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          {notice}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">올린 파일 {items.length}개</p>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded border px-3 py-1.5 text-sm ${
                  item.hasProblem
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-zinc-600 dark:text-zinc-400">
                    {item.status === "reading" ? "읽는 중…" : item.summary}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="shrink-0 text-zinc-500 hover:text-red-600"
                  aria-label={`${item.name} 빼기`}
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
