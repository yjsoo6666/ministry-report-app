// Design Ref: §5.1 — 부처명은 기준표에 줄임말로 바꿔 쓴다.
// Plan SC: 줄임말을 확실히 모르는 부처는 제목의 이름 그대로 쓴다(미리보기에서 눈에 띄게).

// 정식 이름에 들어 있는 글자로 알아본다. (정부 조직 이름이 바뀌어도 핵심 글자는 남기 때문)
const SHORT_NAME_RULES: { matches: (name: string) => boolean; short: string }[] = [
  { matches: (n) => n.includes("지식재산"), short: "지재처" },
  { matches: (n) => n.includes("행정안전"), short: "행안부" },
  { matches: (n) => n.includes("해양수산"), short: "해수부" },
  { matches: (n) => n.includes("산업통상"), short: "산업부" },
  { matches: (n) => n.includes("중소") && n.includes("기업"), short: "중기부" },
  { matches: (n) => n.includes("기후"), short: "기후부" },
];

// 보안: 부처 이름으로 쓸 수 있는 글자는 한글, 영문, 숫자, 가운뎃점, 괄호, 보통 띄어쓰기(스페이스)뿐이고 30자까지다.
// (탭·줄바꿈 같은 보이지 않는 공백 문자는 허용하지 않는다.)
// 문서 제목에 "=HYPERLINK(...)", "+cmd", "@SUM"처럼 엑셀이 수식으로 읽을 수 있는 글자나 이상한 기호가
// 들어 있어도 부처 이름으로 받아들이지 않는다. (엑셀 파일로 내려받을 때 수식 주입을 막는 첫 번째 방어선)
export function isSafeMinistryName(name: string): boolean {
  return /^[가-힣A-Za-z0-9·ㆍ() ]{1,30}$/.test(name) && name.trim() !== "";
}

// 부처 이름을 기준표에 쓸 줄임말로 바꾼다.
// - 이미 줄임말이면 그대로 둔다. (예: "해수부" → "해수부")
// - 규칙에 없는 부처는 앞뒤 공백만 정리해서 그대로 돌려준다. (예: "국토교통부", "산림청")
export function toShortMinistryName(rawName: string): string {
  const trimmed = rawName.trim();
  const compact = trimmed.replace(/\s+/g, "");
  const rule = SHORT_NAME_RULES.find((r) => r.matches(compact));
  return rule ? rule.short : trimmed;
}
