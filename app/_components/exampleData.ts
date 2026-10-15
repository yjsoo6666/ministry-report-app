// Design Ref: §4 — 파일을 읽는 기능이 아직 없어서, 화면을 미리 볼 수 있게 하는 "예시 데이터".
// 숫자는 사진 속 예시 기준표를 흉내 낸 것이며 실제 자료가 아니다. 읽기 기능이 생기면 이 파일은 지운다.

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
  file("지재처", "2차연장", num(9)),
  file("산림청", "1차연장", num(1)),
  file("산림청", "지정취소", num(1)),
  file("기상청", "규격추가", num(1)),
  file("기후부", "1차연장", num(4)),
  file("기후부", "2차연장", num(4)),
  file("국토교통부", "신규지정", num(8)),
  file("국토교통부", "2차연장", num(4)),
  file("국토교통부", "규격추가", num(2)),
  file("행안부", "1차연장", num(1)),
  // 숫자를 읽지 못한 칸 → "확인 필요"
  file("행안부", "2차연장", { kind: "check" }, "건수 문구는 있는데 숫자를 읽지 못했어요."),
  file("산업부", "2차연장", num(8)),
  file("중기부", "1차연장", num(1)),
  file("해수부", "신규지정", num(1)),
  file("해수부", "2차연장", num(1)),
  file("조달청", "신규지정", num(80)),
  file("조달청", "1차연장", num(26)),
  file("조달청", "2차연장", num(19)),
  file("조달청", "지정취소", num(3)),
  // 같은 부처·같은 구분 파일이 둘 → "확인 필요" + 확인 목록
  {
    fileName: "예시부_신규지정.hwpx",
    ministry: "예시부",
    category: "신규지정",
    count: num(2),
  },
  {
    fileName: "예시부_신규지정(1).hwpx",
    ministry: "예시부",
    category: "신규지정",
    count: num(2),
  },
  // 부처명을 읽지 못한 파일 → 표에 넣지 않고 확인 목록에만 표시
  file(null, "신규지정", num(1), "문서 맨 위에서 부처명을 찾지 못했어요."),
];
