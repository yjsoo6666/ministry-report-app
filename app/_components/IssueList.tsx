// Design Ref: §4 ⑤ 확인 목록 — 표에 넣지 못한 파일과, 확인이 필요한 문제를 보여준다.

import type { BuildIssue } from "@/lib/table/buildTable";
import type { ParsedFile } from "@/lib/types";

interface Props {
  excluded: ParsedFile[];
  issues: BuildIssue[];
}

export default function IssueList({ excluded, issues }: Props) {
  if (excluded.length === 0 && issues.length === 0) return null;

  return (
    <section aria-labelledby="issue-title" className="w-full">
      <h2 id="issue-title" className="mb-3 text-xl font-semibold">
        확인이 필요한 파일
      </h2>
      <ul className="flex flex-col gap-2">
        {excluded.map((file) => (
          <li
            key={file.fileName}
            className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <p className="font-medium">{file.fileName}</p>
            <p>표에 넣지 않았어요. {file.problem ?? "부처명이나 구분을 읽지 못했어요."}</p>
          </li>
        ))}
        {issues.map((issue) => (
          <li
            key={issue.fileNames.join("|")}
            className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <p className="font-medium">{issue.fileNames.join(", ")}</p>
            <p>{issue.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
