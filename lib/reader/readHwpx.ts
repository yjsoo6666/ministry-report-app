// Design Ref: §3 글자 꺼내기 — .hwpx(압축 파일) 안의 본문 글자를 줄 목록으로 꺼낸다. 브라우저 안에서만 처리한다.
// Plan SC: 작업 3번. 본문은 Contents/section0.xml 등에 들어 있고, 글자는 <hp:t> 태그 안에 있다고 보고 읽는다.
// 주의: 이 구조는 한글 문서 형식(OWPML)에 대한 가정이며, 실제 부처 파일로 한 번 더 확인해야 한다.
// 보안: 파일 크기·압축 폭탄을 먼저 걸러내고, 글자를 꺼내는 길은 한 번만 훑는 방식(글자 수에 비례)으로 만들어
//       조작된 파일이 브라우저를 멈추게 하지 못하게 한다.

import JSZip from "jszip";
import { MAX_SECTIONS, MAX_SECTION_BYTES, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, MAX_ZIP_ENTRIES } from "../limits";
import { assertEntryCount, assertEntrySize, ZipGuardError } from "./zipGuard";

export class HwpxReadError extends Error {}

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m] ?? m)
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_, dec: string) => safeCodePoint(Number(dec)));
}

// 범위를 벗어난 숫자 기호(예: &#99999999;)가 와도 오류 없이 빈 글자로 바꾼다.
function safeCodePoint(code: number): string {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

// 글자 사이에 끼어 있는 태그(<...>)를 한 번만 훑어서 버린다. 닫히지 않은 "<"는 글자로 둔다.
function stripTags(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("<", i);
    if (open === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, open);
    const close = text.indexOf(">", open + 1);
    if (close === -1) {
      out += text.slice(open);
      break;
    }
    i = close + 1;
  }
  return out;
}

// 여는 <hp:t …> 태그 또는 문단 끝 </hp:p>. ([^<>]로 제한해서 태그 하나가 파일 끝까지 늘어나지 않는다)
const TOKEN = /<hp:t(?:\s[^<>]*)?>|<\/hp:p>/g;
const CLOSE_T = "</hp:t>";

// section XML 하나에서 문단(줄)별 글자를 순서대로 꺼낸다.
// - <hp:t>…</hp:t> 안의 글자를 이어 붙이고, 문단이 끝나는 </hp:p>에서 한 줄로 끊는다.
// - 글자 사이에 끼어 있는 다른 태그(탭, 공백 등)는 버린다.
// - 닫는 </hp:t>가 없는 조작된 파일을 만나면 거기서 멈춘다. (파일 전체를 되풀이해서 훑지 않는다)
export function extractLinesFromSectionXml(xml: string): string[] {
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    const line = current.replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
    current = "";
  };

  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(xml)) !== null) {
    if (match[0] === "</hp:p>") {
      flush();
      continue;
    }
    if (match[0].endsWith("/>")) continue; // <hp:t /> 처럼 글자가 없는 태그

    const start = TOKEN.lastIndex;
    const end = xml.indexOf(CLOSE_T, start);
    if (end === -1) break;
    current += decodeEntities(stripTags(xml.slice(start, end)));
    TOKEN.lastIndex = end + CLOSE_T.length;
  }
  flush();
  return lines;
}

// .hwpx 파일의 본문 전체를 줄 목록으로 돌려준다.
export async function readHwpxLines(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    throw new HwpxReadError(`파일이 너무 커요. ${MAX_UPLOAD_MB}MB 이하만 올릴 수 있어요.`);
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
    assertEntryCount(zip, MAX_ZIP_ENTRIES);
  } catch (error) {
    if (error instanceof ZipGuardError) throw new HwpxReadError(error.message);
    throw new HwpxReadError("파일을 열 수 없어요. 손상되었거나 한글(hwpx) 파일이 아니에요.");
  }

  const sectionNames = Object.keys(zip.files)
    .filter((name) => /^Contents\/section\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  if (sectionNames.length === 0) {
    throw new HwpxReadError("한글 문서 본문을 찾지 못했어요.");
  }
  if (sectionNames.length > MAX_SECTIONS) {
    throw new HwpxReadError("문서 본문이 너무 많아서 열지 않았어요.");
  }

  const lines: string[] = [];
  for (const name of sectionNames) {
    try {
      assertEntrySize(zip.files[name], MAX_SECTION_BYTES);
      const xml = await zip.files[name].async("string");
      lines.push(...extractLinesFromSectionXml(xml));
    } catch (error) {
      if (error instanceof ZipGuardError) throw new HwpxReadError(error.message);
      throw new HwpxReadError("문서 본문을 읽는 중 문제가 생겼어요. 손상된 파일일 수 있어요.");
    }
  }
  return lines;
}
