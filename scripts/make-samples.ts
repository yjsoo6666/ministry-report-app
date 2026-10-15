// 예시 한글(.hwpx) 파일을 폴더에 만든다. (사진 속 문서 양식을 흉내 낸 가짜 파일)
//
// 사용법: npm run samples [출력 폴더]      (기본: samples/예시)
// - 만든 파일은 앱에 올려서 쓰거나, `npm run check -- <폴더>`로 읽기를 확인할 수 있다.
// - samples/ 폴더는 GitHub에 올라가지 않는다.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildHwpx, sampleFiles, SAMPLE_TOTALS } from "./sampleDocs";

async function main() {
  const outDir = process.argv[2] ?? join("samples", "예시");
  mkdirSync(outDir, { recursive: true });

  const files = sampleFiles();
  for (const file of files) {
    writeFileSync(join(outDir, file.fileName), await buildHwpx(file.body));
  }

  console.log(`예시 한글 파일 ${files.length}개를 만들었어요 → ${outDir}`);
  console.log("엑셀 예시표의 계(앱이 이렇게 만들어야 맞아요):", JSON.stringify(SAMPLE_TOTALS));
  console.log(`확인하려면: npm run check -- "${outDir}"`);
}

main().catch((error) => {
  console.error("예시 파일을 만들지 못했어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
