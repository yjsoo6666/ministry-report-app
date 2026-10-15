import { describe, expect, it } from "vitest";
import { parseFile } from "../lib/parse/parseFile";
import { buildTable } from "../lib/table/buildTable";
import { CATEGORIES, type ParsedFile } from "../lib/types";
import { buildHwpx, fullSampleFiles, SAMPLE_MINISTRIES, totalsOf } from "../scripts/sampleDocs";

// 엑셀 예시표의 부처 10곳 × 다섯 구분 = 문서 50개를 한꺼번에 읽어도 정답과 같은 표가 나오는지 확인한다.
// (실제 부처 파일이 아니라 지어낸 문서다)

describe("예시 한글 문서 50개 (10개 부처 × 다섯 구분)", () => {
  const files = fullSampleFiles({ media: false });

  it("정확히 50개이고, 부처·구분 조합이 겹치지 않는다", () => {
    expect(files).toHaveLength(50);
    expect(new Set(files.map((f) => f.fileName)).size).toBe(50);
    expect(new Set(files.map((f) => `${f.ministry}|${f.category}`)).size).toBe(50);
    // 엑셀 예시표에 있는 부처만 쓴다.
    const allowed = new Set(SAMPLE_MINISTRIES.map((m) => m.short));
    expect(files.every((f) => allowed.has(f.ministry))).toBe(true);
  });

  it("구분마다 숫자가 적당히 섞여 있다 (모두 같은 값이 아니다)", () => {
    for (const category of CATEGORIES) {
      const values = new Set(files.filter((f) => f.category === category).map((f) => f.count));
      expect(values.size, category).toBeGreaterThanOrEqual(3);
    }
  });

  it("50개를 모두 읽어 정답과 같은 표(부처 10곳, 빈칸 없음)가 나오고, 확인할 것이 없다", async () => {
    const started = performance.now();
    const parsed: ParsedFile[] = [];
    for (const file of files) {
      const results = await parseFile(file.fileName, await buildHwpx(file.body));
      expect(results, file.fileName).toHaveLength(1);
      expect(results[0], file.fileName).toMatchObject({
        ministry: file.ministry,
        category: file.category,
        count: { kind: "number", value: file.count },
      });
      parsed.push(...results);
    }
    const { table, excluded, issues } = buildTable(parsed);
    const elapsed = performance.now() - started;

    expect(excluded).toEqual([]);
    expect(issues).toEqual([]);
    expect(table.rows).toHaveLength(10);
    const expected = totalsOf(files);
    for (const category of CATEGORIES) {
      expect(table.totals[category], category).toEqual({ kind: "number", value: expected[category] });
    }
    // 모든 칸이 숫자로 채워진다. (칸마다 문서가 하나씩 있으므로)
    for (const row of table.rows) {
      for (const category of CATEGORIES) {
        expect(row.cells[category].kind, `${row.ministry} ${category}`).toBe("number");
      }
    }
    expect(elapsed).toBeLessThan(15_000);
  });

  it("사진 데이터(약 0.5MB)가 들어간 문서도 정상으로 읽힌다", async () => {
    const file = files.find((f) => f.category === "신규지정" && f.ministry === "조달청")!;
    const data = await buildHwpx(file.body, 500 * 1024, 7);
    expect(data.byteLength).toBeGreaterThan(500 * 1024); // 그림은 잘 줄어들지 않는다
    const [result] = await parseFile(file.fileName, data);
    expect(result).toMatchObject({
      ministry: "조달청",
      category: "신규지정",
      count: { kind: "number", value: file.count },
    });
  });
});
