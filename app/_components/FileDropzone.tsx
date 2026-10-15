"use client";

// Design Ref: §4 ② 파일 올리기 — 끌어다 놓거나 버튼으로 한글 파일 여러 개를 고른다.
// Plan SC: 작업 8번. (파일 읽기는 아직 없다. 올린 파일 목록과 빼기까지만 한다.)

import { useRef, useState } from "react";

interface Props {
  files: File[];
  onAdd: (added: File[]) => void;
  onRemove: (index: number) => void;
}

const ACCEPTED = /\.(hwpx|hwp)$/i;

export default function FileDropzone({ files, onAdd, onRemove }: Props) {
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
      </div>

      {notice && (
        <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          {notice}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            올린 파일 {files.length}개
          </p>
          <ul className="flex flex-col gap-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="shrink-0 text-zinc-500 hover:text-red-600"
                  aria-label={`${file.name} 빼기`}
                >
                  빼기
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            파일에서 건수를 읽는 기능은 아직 만들고 있어요. 지금은 올린 파일 목록만 보여요.
          </p>
        </div>
      )}
    </section>
  );
}
