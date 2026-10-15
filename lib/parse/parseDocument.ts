// Design Ref: §5.1 읽기 규칙 — 문서 줄 목록에서 부처명·구분·건수를 읽는다.
// Plan SC: 작업 4·5번. 건수는 문서에 적힌 숫자만 쓰고(추측 금지), 2차 연장은 "인정" 건수만 센다.
// 주의: 아래 문구 규칙은 사진 속 문서를 근거로 한 것이다. 실제 부처 파일로 확인하며 다듬는다.

import type { Category, Cell, ParsedFile } from "../types";
import { isSafeMinistryName, toShortMinistryName } from "./ministryNames";

// 숫자 자리: 숫자 → 읽은 숫자, "-" 또는 비어 있음 → 없음, 그 밖의 글자 → 읽지 못함
const DASH = /^[-–—−]$/;

function toCell(raw: string | undefined): Cell {
  if (raw === undefined || raw.trim() === "") return { kind: "empty" };
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return { kind: "number", value: Number(trimmed) };
  if (DASH.test(trimmed)) return { kind: "empty" };
  return { kind: "check" };
}

// "N개" 앞 숫자 자리에 올 수 있는 글자 (숫자, 대시, 그 밖의 한 글자 덩어리)
const COUNT = String.raw`([^\s()（）]{0,4})?`;

// ① 부처명: 문서 맨 위 제목에서 읽는다.
//   - "[해양수산부]혁신제품 지정 2차 연장 검토" → 대괄호 안
//   - "해양수산부" 처럼 제목이 부처 이름뿐인 경우 → 그 줄
// - 읽은 이름에 허용되지 않는 글자(=, +, @ 등)가 있으면 부처명으로 받아들이지 않고 rejected에 이유를 남긴다.
function readMinistry(lines: string[]): { name: string | null; rejected: boolean } {
  const head = lines.slice(0, 5);
  let candidate: string | null = null;

  for (const line of head) {
    const bracket = line.match(/^[\[［【]\s*([^\]］】]{1,60}?)\s*[\]］】]/);
    if (bracket) {
      candidate = toShortMinistryName(bracket[1]);
      break;
    }
  }
  if (candidate === null) {
    for (const line of head) {
      if (/^[가-힣\s]{2,15}(부|처|청|원|위원회|실)$/.test(line)) {
        candidate = toShortMinistryName(line);
        break;
      }
    }
  }

  if (candidate === null) return { name: null, rejected: false };
  if (!isSafeMinistryName(candidate)) return { name: null, rejected: true };
  return { name: candidate, rejected: false };
}

// ② 연장 문서: 제목의 "1차 연장" / "2차 연장"과 "인정 대상 요약(N개)"에서 읽는다. (접수·미인정은 세지 않는다)
function readExtension(lines: string[]): { category: Category; count: Cell } | null {
  const titleSearch = [...lines.slice(0, 3), ...lines];
  let category: Category | null = null;
  for (const line of titleSearch) {
    const m = line.match(/([12])\s*차\s*연장/);
    if (m) {
      category = m[1] === "1" ? "1차연장" : "2차연장";
      break;
    }
  }
  if (!category) return null;

  // "미인정 대상 요약"은 제외하고 "인정 대상 요약"만 본다.
  const approved = new RegExp(String.raw`(?<!미)인정\s*대상\s*요약\s*[(（]\s*${COUNT}\s*개`);
  for (const line of lines) {
    const m = line.match(approved);
    if (m) return { category, count: toCell(m[1]) };
  }
  return { category, count: { kind: "empty" } };
}

// ③ 신규지정 문서: "〈신규지정〉 N개"에서 읽는다.
function readNewDesignation(lines: string[]): Cell | null {
  const pattern = new RegExp(String.raw`신규\s*지정[^\d가-힣\n]{0,6}\s*${COUNT}\s*개`);
  for (const line of lines) {
    const m = line.match(pattern);
    if (m) return toCell(m[1]);
  }
  return null;
}

// ④ 규격추가: 신규지정 문서 안의 "규격추가 혁신제품 N개" 문구에서 읽는다.
function readSpecAddition(lines: string[]): Cell | null {
  const pattern = new RegExp(String.raw`규격\s*추가\s*혁신제품[^\d가-힣\n]{0,3}\s*${COUNT}\s*개`);
  for (const line of lines) {
    const m = line.match(pattern);
    if (m) return toCell(m[1]);
  }
  return null;
}

// 문서 하나를 읽어 결과를 돌려준다. 한 문서에서 구분이 여러 개 나오면(예: 신규지정 + 규격추가) 여러 개를 돌려준다.
export function parseDocument(fileName: string, lines: string[]): ParsedFile[] {
  const { name: ministry, rejected } = readMinistry(lines);
  const results: ParsedFile[] = [];
  const ministryProblem = rejected
    ? "문서 맨 위의 부처명에 쓸 수 없는 글자(=, +, @ 등)가 있어서 표에 넣지 않았어요."
    : "문서 맨 위에서 부처명을 찾지 못했어요.";

  const extension = readExtension(lines);
  if (extension) {
    results.push({
      fileName,
      ministry,
      category: extension.category,
      count: extension.count,
      problem:
        extension.count.kind === "empty" && !hasApprovedPhrase(lines)
          ? "연장 문서인데 '인정 대상 요약' 건수 문구를 찾지 못했어요."
          : undefined,
    });
  } else {
    const designation = readNewDesignation(lines);
    if (designation) {
      results.push({ fileName, ministry, category: "신규지정", count: designation });
    }
    const spec = readSpecAddition(lines);
    if (spec) {
      results.push({ fileName, ministry, category: "규격추가", count: spec });
    }
  }

  if (results.length === 0) {
    return [
      {
        fileName,
        ministry,
        category: null,
        count: { kind: "empty" },
        problem: "어느 구분(신규지정, 1·2차 연장 등)의 문서인지 알아보지 못했어요.",
      },
    ];
  }

  if (ministry === null) {
    for (const r of results) {
      r.problem = r.problem ?? ministryProblem;
    }
  }
  return results;
}

function hasApprovedPhrase(lines: string[]): boolean {
  const approved = new RegExp(String.raw`(?<!미)인정\s*대상\s*요약\s*[(（]`);
  return lines.some((line) => approved.test(line));
}
