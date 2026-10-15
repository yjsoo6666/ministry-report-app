// Design Ref: §5 ①② — 파일 하나를 열어 글자를 꺼내고(reader), 부처명·구분·건수를 읽는다(parse).
// Plan SC: 작업 3~5번을 한 번에 이어 주는 입구. 읽지 못한 파일은 이유와 함께 "구분 없음" 결과로 돌려준다.

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "../limits";
import { HwpxReadError, readHwpxLines } from "../reader/readHwpx";
import type { ParsedFile } from "../types";
import { parseDocument } from "./parseDocument";

function unreadable(fileName: string, problem: string): ParsedFile[] {
  return [{ fileName, ministry: null, category: null, count: { kind: "empty" }, problem }];
}

// 보안: 너무 큰 파일은 메모리에 올리기 전에 거절한다. (화면에서 파일 크기만 보고 먼저 부른다)
export function tooLargeResult(fileName: string): ParsedFile[] {
  return unreadable(fileName, `파일이 너무 커요. ${MAX_UPLOAD_MB}MB 이하만 올릴 수 있어요.`);
}

// 올린 파일 하나를 읽어 결과 목록으로 돌려준다. (한 파일에서 구분이 여러 개 나올 수 있다)
export async function parseFile(
  fileName: string,
  data: ArrayBuffer | Uint8Array,
): Promise<ParsedFile[]> {
  const lower = fileName.toLowerCase();

  if (data.byteLength > MAX_UPLOAD_BYTES) return tooLargeResult(fileName);

  if (lower.endsWith(".hwpx")) {
    try {
      const lines = await readHwpxLines(data);
      return parseDocument(fileName, lines);
    } catch (error) {
      return unreadable(
        fileName,
        error instanceof HwpxReadError ? error.message : "파일을 읽는 중 문제가 생겼어요.",
      );
    }
  }

  if (lower.endsWith(".hwp")) {
    return unreadable(
      fileName,
      "구형 .hwp 파일은 아직 읽을 수 없어요. 한글 프로그램에서 .hwpx로 다시 저장해서 올려 주세요.",
    );
  }

  return unreadable(fileName, "한글 파일(.hwpx, .hwp)이 아니에요.");
}
