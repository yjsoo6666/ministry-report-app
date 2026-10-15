// 조달심 차수(예: 4차)를 입력받아 화면과 엑셀에 쓸 이름을 만든다. 지난 표는 바로 앞 차수(3차)로 본다.
// 차수를 쓰지 않았거나 올바르지 않으면 "이번 차수"/"지난 차수"로 쓴다.

export interface RoundLabels {
  current: string; // 예: "4차"
  previous: string; // 예: "3차"
  named: boolean; // 차수가 제대로 입력됐는지
}

// 차수는 2~99까지 받는다. (지난 차수가 1 이상이어야 하므로)
export function roundLabels(input: string): RoundLabels {
  const text = input.trim();
  const n = /^\d{1,2}$/.test(text) ? Number(text) : 0;
  if (n >= 2) return { current: `${n}차`, previous: `${n - 1}차`, named: true };
  return { current: "이번 차수", previous: "지난 차수", named: false };
}
