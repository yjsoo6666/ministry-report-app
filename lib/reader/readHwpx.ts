// Design Ref: §3 글자 꺼내기 — .hwpx(압축 파일) 안의 본문 글자를 줄 목록으로 꺼낸다. 브라우저 안에서만 처리한다.
// Plan SC: 작업 3번. 본문은 Contents/section0.xml 등에 들어 있고, 글자는 <hp:t> 태그 안에 있다고 보고 읽는다.
// 주의: 이 구조는 한글 문서 형식(OWPML)에 대한 가정이며, 실제 부처 파일로 한 번 더 확인해야 한다.

import JSZip from "jszip";

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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)));
}

// section XML 하나에서 문단(줄)별 글자를 순서대로 꺼낸다.
// - <hp:t>…</hp:t> 안의 글자를 이어 붙이고, 문단이 끝나는 </hp:p>에서 한 줄로 끊는다.
// - 글자 사이에 끼어 있는 다른 태그(탭, 공백 등)는 버린다.
export function extractLinesFromSectionXml(xml: string): string[] {
  const lines: string[] = [];
  let current = "";
  const token = /<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>|<\/hp:p>/g;

  for (const match of xml.matchAll(token)) {
    if (match[1] !== undefined) {
      current += decodeEntities(match[1].replace(/<[^>]*>/g, ""));
    } else {
      const line = current.replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
      current = "";
    }
  }
  const last = current.replace(/\s+/g, " ").trim();
  if (last) lines.push(last);
  return lines;
}

// .hwpx 파일의 본문 전체를 줄 목록으로 돌려준다.
export async function readHwpxLines(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new HwpxReadError("파일을 열 수 없어요. 손상되었거나 한글(hwpx) 파일이 아니에요.");
  }

  const sectionNames = Object.keys(zip.files)
    .filter((name) => /^Contents\/section\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  if (sectionNames.length === 0) {
    throw new HwpxReadError("한글 문서 본문을 찾지 못했어요.");
  }

  const lines: string[] = [];
  for (const name of sectionNames) {
    const xml = await zip.files[name].async("string");
    lines.push(...extractLinesFromSectionXml(xml));
  }
  return lines;
}
