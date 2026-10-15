// 예시 한글(.hwpx) 문서 만들기 — 사진 속 문서 양식을 흉내 낸 "가짜" 문서를 만든다.
// - 부처 이름과 숫자는 사진 속 엑셀 예시표를 따른다. 업체·제품 이름은 모두 지어낸 것("예시업체 3" 등)이다.
// - 실제 부처 파일이 아니다. 앱의 읽기 규칙이 사진 양식에서 맞게 동작하는지 확인하는 용도다.
// - 표는 실제 한글처럼 "표 > 칸 > 문단" 구조로 만든다. (표 안의 글자도 읽어내야 하므로)

import JSZip from "jszip";
import type { Category } from "../lib/types";

export interface SampleMinistry {
  short: string; // 기준표에 쓰는 줄임말
  full: string; // 문서에 적히는 정식 이름
}

// 엑셀 예시표의 부처 순서
export const SAMPLE_MINISTRIES: SampleMinistry[] = [
  { short: "지재처", full: "지식재산처" },
  { short: "산림청", full: "산림청" },
  { short: "기상청", full: "기상청" },
  { short: "기후부", full: "기후에너지환경부" },
  { short: "국토교통부", full: "국토교통부" },
  { short: "행안부", full: "행정안전부" },
  { short: "산업부", full: "산업통상부" },
  { short: "중기부", full: "중소벤처기업부" },
  { short: "해수부", full: "해양수산부" },
  { short: "조달청", full: "조달청" },
];

// 엑셀 예시표의 숫자 (비어 있는 칸은 문서가 없다)
export const SAMPLE_COUNTS: Record<string, Partial<Record<Category, number>>> = {
  지재처: { "2차연장": 9 },
  산림청: { "1차연장": 1, 지정취소: 1 },
  기상청: { 규격추가: 1 },
  기후부: { "1차연장": 4, "2차연장": 4 },
  국토교통부: { 신규지정: 8, "2차연장": 4, 규격추가: 2 },
  행안부: { "1차연장": 1, "2차연장": 3 },
  산업부: { "2차연장": 8 },
  중기부: { "1차연장": 1 },
  해수부: { 신규지정: 1, "2차연장": 1 },
  조달청: { 신규지정: 80, "1차연장": 26, "2차연장": 19, 지정취소: 3 },
};

// 엑셀 예시표의 "계" 행
export const SAMPLE_TOTALS: Record<Category, number> = {
  신규지정: 89,
  "1차연장": 33,
  "2차연장": 48,
  지정취소: 4,
  규격추가: 3,
};

// ── 한글 문서 XML 조각 ─────────────────────────────────────────────

const esc = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 문단 하나
const para = (text: string) => `<hp:p><hp:run><hp:t>${esc(text)}</hp:t></hp:run></hp:p>`;

// 표: 표 > 줄 > 칸 > 칸 안의 문단 (실제 한글 문서와 같은 겹 구조)
function table(rows: (string | number)[][]): string {
  const body = rows
    .map(
      (row) =>
        `<hp:tr>${row
          .map((cell) => `<hp:tc><hp:subList>${para(String(cell))}</hp:subList></hp:tc>`)
          .join("")}</hp:tr>`,
    )
    .join("");
  return `<hp:p><hp:run><hp:tbl>${body}</hp:tbl></hp:run></hp:p>`;
}

// 숫자가 0이면 문서에는 "-"로 적는다. (사진 속 문서처럼)
const dash = (n: number) => (n === 0 ? "-" : n);

// ── 문서 종류별 본문 ───────────────────────────────────────────────

// 1차·2차 연장 검토 결과 (사진 1 양식). 접수 = 인정 + 미인정.
export function extensionDocument(
  full: string,
  round: 1 | 2,
  approved: number,
  rejected = 0,
): string[] {
  const received = approved + rejected;
  const detailRows = (n: number) =>
    Array.from({ length: n }, (_, i) => [i + 1, `2022-${100 + i}`, "NET", `예시 혁신제품 ${i + 1}`, `예시업체 ${i + 1}`]);
  return [
    para(`[${full}]혁신제품 지정 ${round}차 연장 검토`),
    para(`1. 혁신제품 지정 ${round}차 연장 접수 현황`),
    para("신청접수 기간 : `26. 5. 12. ~ `26. 6. 10."),
    para(`접수 현황(${received}개)`),
    para("(단위: 개)"),
    table([
      ["지정자격", `${round}차 연장 대상`, "접수", "", "미접수"],
      ["", "", "가능", "불가(제외)", ""],
      ["우수연구개발", "-", "-", "-", "-"],
      ["NET", dash(received), dash(received), "-", "-"],
      ["합계", dash(received), dash(received), "-", "-"],
    ]),
    para("세부 접수현황"),
    table([["No.", "지정번호", "지정자격", "혁신제품명", "기업명"], ...detailRows(received)]),
    para(`2. 혁신제품 지정 ${round}차 연장 인정`),
    para(`인정 대상 요약(${dash(approved)}개)`),
    para("(단위: 개)"),
    table([
      ["연장 상세 요건", "", "", "", "최종(중복제거)"],
      ["공공성 요건", "", "혁신성 요건", "", ""],
      ["1-1. 조달실적 존재", "1-2. 구매계약 체결", "2-1. 유사기술 유무", "2-2. 기술 탁월성", ""],
      [dash(approved), "-", "-", "-", dash(approved)],
    ]),
    para("인정 대상 세부 현황"),
    table([["No.", "지정번호", "지정자격", "혁신제품명", "기업명", "연장사유"], ...detailRows(approved).map((r) => [...r, "1-1"])]),
    para(`3. 혁신제품 지정 ${round}차 연장 미인정`),
    para(`미인정 대상 요약(${dash(rejected)}개)`),
    para("(단위: 개)"),
    table([
      ["상세 사유 별 연장불가대상", "", "", "", "최종(중복제거)"],
      ["미신청 및 미접수", "기술유효성 상실", "부정당업자 제재", "공공성 요건 미충족", dash(rejected)],
      ["-", "-", "-", "-", dash(rejected)],
    ]),
    para(`4. 혁신제품 지정 ${round}차 연장 합동평가 논의 필요`),
    para("논의 필요 대상 요약(-개)"),
    table([["No.", "지정자격", "지정번호", "혁신제품명", "기업명", "논의사유"], [1, "-", "-", "-", "-", ""]]),
  ];
}

// 신규지정 문서 (사진 2 양식). 지정취소·규격추가 문서도 "같은 양식"으로 만들고 유형 이름만 바꾼다.
export function typeDocument(
  full: string,
  label: "신규지정" | "지정취소" | "규격추가",
  count: number,
): string[] {
  const items = Array.from({ length: count }, (_, i) => [
    i + 1,
    full,
    "",
    `예시업체 ${i + 1}`,
    `예시 혁신제품 ${i + 1}`,
    "예시 공공문제 설명",
    "예시 기대효과 설명",
  ]);
  return [
    para(full),
    para(`유형 | 〈${label}〉 ${dash(count)}개`),
    table([["No.", "부처", "사진", "업체명", "혁신명", "공공문제", "기대효과"], ...items]),
    // 사진 속 문서처럼 이 문구의 숫자는 비어 있다.
    para("〈기존 FT 및 유형 | 규격추가 혁신제품〉 개 (※제품수 기준)"),
    table([["No.", "부처", "사진", "업체명", "혁신명", "기존 물품식별번호", "추가 세부물품식별번호"], ["", "", "", "", "", "", ""]]),
    para("〈제품인증 대상 규격-신규〉"),
    table([["No.", "모델명", "물품분류번호(8자리)", "품명", "물품식별번호(8자리)", "비고(업체명)"], ["", "", "", "", "", ""]]),
    para("〈제품인증 대상 규격-규격추가〉"),
    table([["No.", "모델명", "물품분류번호(8자리)", "품명", "물품식별번호(8자리)", "비고(업체명)"], ["", "", "", "", "", ""]]),
  ];
}

// 본문 XML → .hwpx(압축 파일) 바이트
export async function buildHwpx(body: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip");
  zip.file(
    "Contents/section0.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">${body.join("")}</hs:sec>`,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ── 엑셀 예시표 전체를 문서 묶음으로 ─────────────────────────────────

export interface SampleFile {
  fileName: string;
  ministry: string; // 기대하는 줄임말
  category: Category;
  count: number;
  body: string[];
}

const CATEGORY_NUMBER: Record<Category, number> = {
  신규지정: 1,
  "1차연장": 2,
  "2차연장": 3,
  지정취소: 4,
  규격추가: 5,
};

// 엑셀 예시표의 칸(숫자가 있는 칸)마다 문서 하나씩 만든다.
export function sampleFiles(): SampleFile[] {
  const files: SampleFile[] = [];
  for (const { short, full } of SAMPLE_MINISTRIES) {
    const cells = SAMPLE_COUNTS[short] ?? {};
    (Object.keys(CATEGORY_NUMBER) as Category[]).forEach((category, order) => {
      const count = cells[category];
      if (count === undefined) return;

      let body: string[];
      let title: string;
      if (category === "1차연장" || category === "2차연장") {
        const round = category === "1차연장" ? 1 : 2;
        // 접수는 인정보다 많게(미인정이 있는 것처럼) 만들어, 접수 건수를 세면 틀리도록 한다.
        const rejected = (order + count) % 3;
        body = extensionDocument(full, round, count, rejected);
        title = `'26년도 지정 ${round}차 연장 검토 결과`;
      } else {
        body = typeDocument(full, category, count);
        title = category === "신규지정" ? "'26년도 혁신제품 지정(안)(유형1)" : `'26년도 혁신제품 ${category}(안)`;
      }
      files.push({
        fileName: `${CATEGORY_NUMBER[category]}-1. (${full}) ${title}.hwpx`,
        ministry: short,
        category,
        count,
        body,
      });
    });
  }
  return files;
}
