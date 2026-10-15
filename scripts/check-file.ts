// 내 컴퓨터에서만 돌리는 "읽기 확인" 도구. 한글 파일을 앱과 똑같은 방식으로 읽어서 결과를 화면에 보여준다.
// - 파일을 어디로도 보내지 않고, 아무것도 저장·수정하지 않는다. (네트워크도 쓰지 않는다)
// - 실제 부처 파일을 AI에게 보여주지 않고도 "앱이 이 파일을 맞게 읽는지" 직접 확인하기 위한 것이다.
//
// 사용법: npm run check -- <파일 또는 폴더> [더 많은 파일/폴더] [--lines]
//   --lines  : 문서에서 꺼낸 글자 줄도 함께 보여준다 (읽기가 틀렸을 때 원인을 찾을 때 쓴다)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parseFile } from "../lib/parse/parseFile";
import { readHwpxLines } from "../lib/reader/readHwpx";
import { buildTable } from "../lib/table/buildTable";
import { CATEGORIES, CATEGORY_LABELS, type Cell, type ParsedFile } from "../lib/types";

const args = process.argv.slice(2);
const showLines = args.includes("--lines");
const targets = args.filter((a) => a !== "--lines");

if (targets.length === 0) {
  console.log("사용법: npm run check -- <한글 파일 또는 폴더> [--lines]");
  process.exit(1);
}

// 폴더를 주면 그 안의 .hwpx / .hwp 파일을 모은다 (하위 폴더는 보지 않는다).
function collect(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter((name) => /\.(hwpx|hwp)$/i.test(name))
      .sort()
      .map((name) => join(path, name));
  }
  return [path];
}

function cellText(cell: Cell): string {
  if (cell.kind === "number") return String(cell.value);
  if (cell.kind === "check") return "확인 필요";
  return "·";
}

async function main() {
  const files = targets.flatMap(collect);
  if (files.length === 0) {
    console.log("읽을 한글 파일(.hwpx, .hwp)을 찾지 못했어요.");
    return;
  }

  const all: ParsedFile[] = [];
  for (const path of files) {
    const name = basename(path);
    const bytes = readFileSync(path);
    console.log(`\n■ ${name}`);

    if (showLines && /\.hwpx$/i.test(name)) {
      try {
        const lines = await readHwpxLines(bytes);
        console.log(`  글자 줄 ${lines.length}개 (앞 40개):`);
        lines.slice(0, 40).forEach((line, i) => console.log(`   ${String(i + 1).padStart(2)}| ${line}`));
      } catch (error) {
        console.log(`  글자를 꺼내지 못했어요: ${error instanceof Error ? error.message : error}`);
      }
    }

    const results = await parseFile(name, bytes);
    all.push(...results);
    for (const r of results) {
      const who = r.ministry ?? "(부처명 못 읽음)";
      const what = r.category ? CATEGORY_LABELS[r.category] : "(구분 못 알아봄)";
      console.log(`  → ${who} · ${what} · 건수: ${cellText(r.count)}${r.problem ? `  ⚠ ${r.problem}` : ""}`);
    }
  }

  // 앱의 미리보기 표와 같은 결과를 글자로 보여준다.
  const { table, excluded, issues } = buildTable(all);
  console.log("\n=== 앱에서 만들어질 표 ===");
  const header = ["부처", ...CATEGORIES.map((c) => CATEGORY_LABELS[c])];
  console.log(header.join("\t"));
  for (const row of table.rows) {
    console.log([row.ministry, ...CATEGORIES.map((c) => cellText(row.cells[c]))].join("\t"));
  }
  console.log(["계", ...CATEGORIES.map((c) => cellText(table.totals[c]))].join("\t"));

  if (excluded.length > 0 || issues.length > 0) {
    console.log("\n=== 확인이 필요한 파일 ===");
    excluded.forEach((f) => console.log(`- ${f.fileName}: ${f.problem ?? "표에 넣지 못했어요."}`));
    issues.forEach((i) => console.log(`- ${i.fileNames.join(", ")}: ${i.message}`));
  }
  console.log("\n(· = 빈칸)");
}

main().catch((error) => {
  console.error("확인 중 문제가 생겼어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
