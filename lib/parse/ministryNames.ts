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

// 부처 이름을 기준표에 쓸 줄임말로 바꾼다.
// - 이미 줄임말이면 그대로 둔다. (예: "해수부" → "해수부")
// - 규칙에 없는 부처는 앞뒤 공백만 정리해서 그대로 돌려준다. (예: "국토교통부", "산림청")
export function toShortMinistryName(rawName: string): string {
  const trimmed = rawName.trim();
  const compact = trimmed.replace(/\s+/g, "");
  const rule = SHORT_NAME_RULES.find((r) => r.matches(compact));
  return rule ? rule.short : trimmed;
}
