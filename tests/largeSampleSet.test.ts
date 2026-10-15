import { describe, expect, it } from "vitest";
import { parseFile } from "../lib/parse/parseFile";
import { buildTable } from "../lib/table/buildTable";
import { CATEGORIES, type ParsedFile } from "../lib/types";
import { buildHwpx, largeSampleFiles, totalsOf } from "../scripts/sampleDocs";

// 예시 한글 문서 100개(엑셀 예시표 19개 + 덧붙인 부처 81개)를 한꺼번에 읽어도 정답과 같은 표가 나오는지 확인한다.
// (실제 부처 파일이 아니라 지어낸 문서다)

describe("예시 한글 문서 100개", () => {
  const files = largeSampleFiles({ media: false });

  it("정확히 100개이고 파일 이름이 겹치지 않는다", () => {
    expect(files).toHaveLength(100);
    expect(new Set(files.map((f) => f.fileName)).size).toBe(100);
  });

  it("100개를 모두 읽어 정답과 같은 표(부처 27곳)가 나오고, 확인할 것이 없다", async () => {
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
    expect(table.rows).toHaveLength(27); // 엑셀 예시표 10곳 + 덧붙인 17곳
    const expected = totalsOf(files);
    for (const category of CATEGORIES) {
      expect(table.totals[category], category).toEqual({ kind: "number", value: expected[category] });
    }
    // 만들기(압축)까지 포함해도 몇 초 안에 끝난다. (느슨한 기준 — 아주 느린 컴퓨터를 위해 넉넉히)
    expect(elapsed).toBeLessThan(15_000);
  });

  it("사진 데이터(약 0.5MB)가 들어간 문서도 정상으로 읽힌다", async () => {
    const file = files.find((f) => f.category === "신규지정" && f.ministry === "조달청")!;
    const data = await buildHwpx(file.body, 500 * 1024, 7);
    expect(data.byteLength).toBeGreaterThan(500 * 1024); // 그림은 잘 줄어들지 않는다
    const [result] = await parseFile(file.fileName, data);
    expect(result).toMatchObject({ ministry: "조달청", category: "신규지정", count: { kind: "number", value: 80 } });
  });
});
