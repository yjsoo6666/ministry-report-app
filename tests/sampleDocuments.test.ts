import { describe, expect, it } from "vitest";
import { parseFile } from "../lib/parse/parseFile";
import { readHwpxLines } from "../lib/reader/readHwpx";
import { buildTable } from "../lib/table/buildTable";
import { CATEGORIES, type ParsedFile } from "../lib/types";
import {
  buildHwpx,
  SAMPLE_MINISTRIES,
  SAMPLE_TOTALS,
  sampleFiles,
} from "../scripts/sampleDocs";

// 사진 양식을 흉내 낸 예시 문서(엑셀 예시표의 부처·숫자)를 만들어, 앱이 엑셀 예시표와 같은 표를 만드는지 확인한다.
// 실제 부처 파일이 아니라 지어낸 문서다. (표는 실제 한글처럼 표 > 칸 > 문단 구조)

describe("예시 한글 문서 → 엑셀 예시표", () => {
  const files = sampleFiles();

  it("엑셀 예시표의 숫자 칸마다 문서가 하나씩 만들어진다 (19개)", () => {
    expect(files).toHaveLength(19);
  });

  it("문서마다 부처·구분·건수가 엑셀 예시표 그대로 읽힌다", async () => {
    for (const file of files) {
      const results = await parseFile(file.fileName, await buildHwpx(file.body));
      expect(results, file.fileName).toHaveLength(1);
      expect(results[0], file.fileName).toMatchObject({
        ministry: file.ministry,
        category: file.category,
        count: { kind: "number", value: file.count },
      });
      expect(results[0].problem, file.fileName).toBeUndefined();
    }
  });

  it("전부 합치면 엑셀 예시표와 같은 표(부처 10곳, 계 89·33·48·4·3)가 나온다", async () => {
    const parsed: ParsedFile[] = [];
    for (const file of files) {
      parsed.push(...(await parseFile(file.fileName, await buildHwpx(file.body))));
    }
    const { table, excluded, issues } = buildTable(parsed);

    expect(excluded).toEqual([]);
    expect(issues).toEqual([]);
    expect(table.rows.map((r) => r.ministry)).toEqual(SAMPLE_MINISTRIES.map((m) => m.short));
    for (const category of CATEGORIES) {
      expect(table.totals[category], category).toEqual({
        kind: "number",
        value: SAMPLE_TOTALS[category],
      });
    }
  });

  it("엑셀 예시표의 칸마다 숫자가 같다 (빈칸은 빈칸)", async () => {
    const parsed: ParsedFile[] = [];
    for (const file of files) {
      parsed.push(...(await parseFile(file.fileName, await buildHwpx(file.body))));
    }
    const { table } = buildTable(parsed);
    for (const row of table.rows) {
      for (const category of CATEGORIES) {
        const expected = files.find((f) => f.ministry === row.ministry && f.category === category);
        expect(row.cells[category], `${row.ministry} ${category}`).toEqual(
          expected ? { kind: "number", value: expected.count } : { kind: "empty" },
        );
      }
    }
  });

  it("연장 문서는 접수 건수가 인정 건수와 다른데도 인정 건수만 읽는다", async () => {
    const extensions = files.filter((f) => f.category === "1차연장" || f.category === "2차연장");
    let differing = 0;
    for (const file of extensions) {
      const lines = await readHwpxLines(await buildHwpx(file.body));
      const received = Number(lines.find((l) => l.startsWith("접수 현황("))!.match(/\((\d+)개\)/)![1]);
      if (received !== file.count) differing++;
    }
    expect(differing).toBeGreaterThanOrEqual(5); // 접수를 세면 틀리는 문서가 충분히 섞여 있다
  });

  it("표 안의 글자까지 포함해 꺼낸 줄이 많아도(표 > 칸 > 문단) 정상으로 읽힌다", async () => {
    const big = files.find((f) => f.ministry === "조달청" && f.category === "신규지정")!;
    const lines = await readHwpxLines(await buildHwpx(big.body));
    expect(lines.length).toBeGreaterThan(400); // 80개 항목 × 7칸 + 머리글
    expect(lines.filter((l) => l === "예시업체 80")).toHaveLength(1);
  });

  it("지정취소·규격추가 문서는 신규지정과 같은 양식(규격추가 혁신제품 빈 줄 포함)이어도 자기 구분으로 읽힌다", async () => {
    const cancel = files.find((f) => f.category === "지정취소")!;
    const spec = files.find((f) => f.category === "규격추가")!;
    const lines = await readHwpxLines(await buildHwpx(cancel.body));
    expect(lines.some((l) => l.includes("규격추가 혁신제품〉 개"))).toBe(true); // 같은 양식의 빈 줄
    expect((await parseFile(cancel.fileName, await buildHwpx(cancel.body)))[0].category).toBe("지정취소");
    expect((await parseFile(spec.fileName, await buildHwpx(spec.body)))[0].category).toBe("규격추가");
  });
});
