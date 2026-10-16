// 예시 한글(.hwpx) 파일을 폴더에 만든다. (사진 속 문서 양식을 흉내 낸 가짜 파일)
//
// 사용법:
//   npm run samples                    엑셀 예시표를 그대로 재현하는 19개 → samples/예시
//   npm run samples:40                 10개 부처 × 다섯 구분 중 10칸을 뺀 40개(빈칸 있음, 사진 데이터 포함) → samples/예시40
//   npm run samples:check              예시 40개와 함께 올려서 확인 카드를 보는 파일 2개(복사본, 건수 문구 없음) → samples/확인용
//   npm run samples -- <폴더> [--full]   폴더와 종류를 직접 고르기
// - 만든 파일은 앱에 올려서 쓰거나, `npm run check -- <폴더>`로 읽기를 확인할 수 있다.
// - samples/ 폴더는 GitHub에 올라가지 않는다.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildHwpx, checkSampleFiles, partialSampleFiles, sampleFiles, SAMPLE_TOTALS, totalsOf } from "./sampleDocs";

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes("--full");
  const check = args.includes("--check");
  const outDir = args.find((a) => !a.startsWith("--")) ?? join("samples", check ? "확인용" : full ? "예시40" : "예시");
  mkdirSync(outDir, { recursive: true });

  if (check) {
    for (const [index, file] of checkSampleFiles().entries()) {
      writeFileSync(join(outDir, file.fileName), await buildHwpx(file.body, file.mediaBytes, index + 1));
      console.log(`- ${file.fileName}  (${file.expect})`);
    }
    console.log(`확인용 파일 2개를 만들었어요 → ${outDir}`);
    console.log("예시 40개와 함께 올리면 2단계에 확인 카드 2장이 떠야 해요.");
    return;
  }

  const files = full ? partialSampleFiles() : sampleFiles();
  let bytes = 0;
  for (const [index, file] of files.entries()) {
    const data = await buildHwpx(file.body, file.mediaBytes, index + 1);
    bytes += data.byteLength;
    writeFileSync(join(outDir, file.fileName), data);
  }

  console.log(`예시 한글 파일 ${files.length}개(합계 ${(bytes / 1024 / 1024).toFixed(1)}MB)를 만들었어요 → ${outDir}`);
  console.log("앱이 이렇게 만들어야 맞는 구분별 계:", JSON.stringify(full ? totalsOf(files) : SAMPLE_TOTALS));
  console.log(`확인하려면: npm run check -- "${outDir}"`);
}

main().catch((error) => {
  console.error("예시 파일을 만들지 못했어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
