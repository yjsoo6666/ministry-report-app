// Design Ref: §4 — 파일이 없을 때 화면을 미리 볼 수 있게 하는 "예시 데이터".
// 부처 이름과 숫자는 모두 지어낸 가짜다(실제 부처·자료와 무관). 이 파일은 브라우저로 그대로 내려가므로 실제 값을 넣지 않는다.
// 배포 전에 예시 기능을 없애려면 이 파일과 page.tsx의 예시 버튼을 함께 지운다.

import type { Category, Cell, ParsedFile } from "@/lib/types";

const num = (value: number): Cell => ({ kind: "number", value });

function file(
  ministry: string | null,
  category: Category | null,
  count: Cell,
  problem?: string,
): ParsedFile {
  const name = `${ministry ?? "부처명없음"}_${category ?? "구분없음"}.hwpx`;
  return { fileName: name, ministry, category, count, problem };
}

export const EXAMPLE_FILES: ParsedFile[] = [
  file("예시1부", "신규지정", num(3)),
  file("예시1부", "2차연장", num(2)),
  file("예시2청", "1차연장", num(1)),
  file("예시2청", "지정취소", num(1)),
  file("예시3처", "규격추가", num(2)),
  file("예시4부", "1차연장", num(4)),
  file("예시4부", "2차연장", num(5)),
  file("예시5부", "신규지정", num(6)),
  file("예시5부", "2차연장", num(1)),
  // 숫자를 읽지 못한 칸 → "확인 필요"
  file("예시6부", "2차연장", { kind: "check" }, "건수 문구는 있는데 숫자를 읽지 못했어요."),
  file("예시6부", "1차연장", num(2)),
  file("예시7청", "신규지정", num(1)),
  // 같은 부처·같은 구분 파일이 둘 → "확인 필요" + 확인 목록
  {
    fileName: "예시8부_신규지정.hwpx",
    ministry: "예시8부",
    category: "신규지정",
    count: num(2),
  },
  {
    fileName: "예시8부_신규지정(1).hwpx",
    ministry: "예시8부",
    category: "신규지정",
    count: num(2),
  },
  // 부처명을 읽지 못한 파일 → 표에 넣지 않고 확인 목록에만 표시
  file(null, "신규지정", num(1), "문서 맨 위에서 부처명을 찾지 못했어요."),
];
