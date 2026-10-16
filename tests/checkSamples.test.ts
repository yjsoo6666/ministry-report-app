import { describe, expect, it } from "vitest";
import { parseFile } from "../lib/parse/parseFile";
import { buildTable } from "../lib/table/buildTable";
import { CATEGORIES, type ParsedFile } from "../lib/types";
import { buildHwpx, checkSampleFiles, partialSampleFiles, totalsOf } from "../scripts/sampleDocs";

// 예시 40개에 "확인용 2개"(복사본, 건수 문구 없음)를 더해도 계는 그대로이고, 확인 알림이 정확히 2개 뜨는지 확인한다.

describe("확인용 예시 파일 2개", () => {
  const base = partialSampleFiles({ media: false });

  it("40개 + 확인용 2개를 읽으면 계는 40개일 때와 같고 알림이 2개 뜬다", async () => {
    const parsed: ParsedFile[] = [];
    for (const file of base) parsed.push(...(await parseFile(file.fileName, await buildHwpx(file.body))));
    for (const file of checkSampleFiles()) {
      parsed.push(...(await parseFile(file.fileName, await buildHwpx(file.body))));
    }
    const { table, excluded, issues } = buildTable(parsed);

    expect(excluded).toEqual([]);
    const expected = totalsOf(base);
    for (const category of CATEGORIES) {
      expect(table.totals[category], category).toEqual({ kind: "number", value: expected[category] });
    }
    // 국토교통부 신규지정은 복사본이 있어도 5로 한 번만 센다. 산업부 지정취소는 빈칸이다.
    const molit = table.rows.find((r) => r.ministry === "국토교통부")!;
    expect(molit.cells.신규지정).toEqual({ kind: "number", value: 5 });
    const industry = table.rows.find((r) => r.ministry === "산업부")!;
    expect(industry.cells.지정취소).toEqual({ kind: "empty" });

    expect(issues).toHaveLength(2);
    const copy = issues.find((i) => i.cell.ministry === "국토교통부")!;
    expect(copy.cell.category).toBe("신규지정");
    expect(copy.message).toContain("복사");
    const missing = issues.find((i) => i.cell.ministry === "산업부")!;
    expect(missing.cell.category).toBe("지정취소");
    expect(missing.message).toContain("건수 문구를 찾지 못했어요");
  });
});
