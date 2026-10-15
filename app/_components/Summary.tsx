// Design Ref: §4 ③ 요약 — 파일 수, 부처 수, 확인이 필요한 칸·파일 수를 한 줄로 보여준다.

interface Props {
  fileCount: number;
  ministryCount: number;
  checkCellCount: number;
  problemFileCount: number;
}

export default function Summary({
  fileCount,
  ministryCount,
  checkCellCount,
  problemFileCount,
}: Props) {
  const needsCheck = checkCellCount > 0 || problemFileCount > 0;
  return (
    <p
      role="status"
      className={`rounded px-3 py-2 text-sm ${
        needsCheck
          ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      파일 {fileCount}개 · 부처 {ministryCount}곳 · 확인 필요 {checkCellCount}칸 · 확인할 파일{" "}
      {problemFileCount}개
    </p>
  );
}
