// 보안: 작게 압축됐지만 풀면 엄청나게 커지는 "압축 폭탄" 파일을 풀기 전에 걸러낸다.
// 압축 파일 머리에 적힌 "풀었을 때 크기"를 보고 판단한다. (JSZip은 실제로 풀 때 이 값과 다르면 오류를 낸다)

import type JSZip from "jszip";

export class ZipGuardError extends Error {}

// JSZip이 항목마다 들고 있는 "풀었을 때 크기". 알 수 없으면 null.
export function declaredSize(entry: JSZip.JSZipObject): number | null {
  const data = (entry as unknown as { _data?: { uncompressedSize?: number } })._data;
  return typeof data?.uncompressedSize === "number" ? data.uncompressedSize : null;
}

// 항목 개수가 너무 많은지 확인한다.
export function assertEntryCount(zip: JSZip, maxEntries: number) {
  if (Object.keys(zip.files).length > maxEntries) {
    throw new ZipGuardError("파일 안의 항목이 너무 많아서 열지 않았어요.");
  }
}

// 항목 하나를 풀었을 때 크기가 한도를 넘는지 확인한다.
export function assertEntrySize(entry: JSZip.JSZipObject, maxBytes: number) {
  const size = declaredSize(entry);
  if (size !== null && size > maxBytes) {
    throw new ZipGuardError("파일 안의 내용이 너무 커서 열지 않았어요.");
  }
}

// 모든 항목을 풀었을 때의 전체 크기가 한도를 넘는지 확인한다.
export function assertTotalSize(zip: JSZip, maxBytes: number) {
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    total += declaredSize(entry) ?? 0;
    if (total > maxBytes) {
      throw new ZipGuardError("파일 안의 내용이 너무 커서 열지 않았어요.");
    }
  }
}
