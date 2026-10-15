// Design Ref: §6 — 앱 전체가 함께 쓰는 데이터 모양.
// Plan SC: 작업 1번. 읽기·합치기·화면·엑셀이 모두 이 모양을 쓰므로 가장 먼저 정한다.

// 구분 5가지. 엑셀 가로 순서와 같다. (값 목록은 한 곳에서만 관리한다)
export const CATEGORIES = [
  "신규지정",
  "1차연장",
  "2차연장",
  "지정취소",
  "규격추가",
] as const;

export type Category = (typeof CATEGORIES)[number];

// 화면과 엑셀 머리글에 쓰는 이름 (예시 기준표와 같은 표기)
export const CATEGORY_LABELS: Record<Category, string> = {
  신규지정: "신규 지정",
  "1차연장": "1차 연장",
  "2차연장": "2차 연장",
  지정취소: "지정취소",
  규격추가: "규격추가",
};

// 표의 한 칸 값.
// - empty : 건수 없음 (해당 구분 파일이 없거나 문서에 "-")
// - number: 문서에서 읽은 숫자
// - check : 읽어야 하는데 못 읽음 → 화면과 엑셀에 "확인 필요"로 표시
export type Cell =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "check" };

// 파일 하나를 읽은 결과.
export interface ParsedFile {
  fileName: string;
  // 줄임말로 바꾼 부처명. 못 읽으면 null (이 경우 표에 넣지 않고 확인 목록에 보여준다)
  ministry: string | null;
  // 파일의 구분. 알아보지 못하면 null
  category: Category | null;
  count: Cell;
  // 사용자에게 보여줄 문제 설명 (한국어)
  problem?: string;
}

// 합친 표의 한 줄 (부처 하나).
export interface TableRow {
  ministry: string;
  cells: Record<Category, Cell>;
  // 담당자가 직접 고친 칸 (색으로 구분해서 보여준다)
  edited: Partial<Record<Category, boolean>>;
}

// 합친 표 전체.
export interface Table {
  rows: TableRow[];
  // 맨 아래 "계" 행. 부처별 "계" 열은 없다.
  totals: Record<Category, Cell>;
}
