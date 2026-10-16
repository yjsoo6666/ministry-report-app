import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { readReport } from "../lib/excel/readReport";
import { writeComparison } from "../lib/excel/writeComparison";
import { writeReport } from "../lib/excel/writeReport";
import { buildTable } from "../lib/table/buildTable";
import { compareTables } from "../lib/table/compareTables";
import type { Category, Cell, ParsedFile, PreviousReport } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const file = (ministry: string, category: Category, count: Cell): ParsedFile => ({
  fileName: `${ministry}${category}.hwpx`,
  ministry,
  category,
  count,
});

const { table } = buildTable([
  file("해수부", "신규지정", num(3)),
  file("해수부", "2차연장", num(2)),
  file("산림청", "신규지정", num(5)),
  file("산림청", "지정취소", num(1)),
]);

const previous: PreviousReport = {
  rows: [
    { ministry: "해수부", cells: { 신규지정: num(1), "1차연장": { kind: "empty" }, "2차연장": num(2), 지정취소: { kind: "empty" }, 규격추가: { kind: "empty" } } },
    { ministry: "산림청", cells: { 신규지정: num(4), "1차연장": { kind: "empty" }, "2차연장": { kind: "empty" }, 지정취소: num(1), 규격추가: { kind: "empty" } } },
  ],
};

async function parts(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const read = async (name: string) => (await zip.file(name)?.async("string")) ?? "";
  return {
    names: Object.keys(zip.files),
    read,
    sheet: await read("xl/worksheets/sheet1.xml"),
    types: await read("[Content_Types].xml"),
  };
}

describe("기준표 엑셀의 그래프", () => {
  it("표 옆에 그래프 2개(구분별 합계, 부처별 구성)가 들어가고, 그래프 부품이 파일 구조에 등록된다", async () => {
    const p = await parts(await writeReport(table));
    expect(p.names).toContain("xl/charts/chart1.xml");
    expect(p.names).toContain("xl/charts/chart2.xml");
    expect(p.sheet).toContain('<drawing r:id="rIdDrawing1"/>');
    expect(p.types).toContain("/xl/charts/chart1.xml");
    expect(p.types).toContain("/xl/drawings/drawing1.xml");

    // 합계 그래프는 "계" 줄(부처 2곳이라 4행)을, 구성 그래프는 부처 줄(2~3행)을 가리킨다.
    const c1 = await p.read("xl/charts/chart1.xml");
    expect(c1).toContain("구분별 합계");
    expect(c1).toContain("'기준표'!$B$4:$F$4");
    expect(c1).toContain('<c:v>8</c:v>'); // 신규지정 계 3+5
    const c2 = await p.read("xl/charts/chart2.xml");
    expect(c2).toContain('<c:grouping val="stacked"/>');
    expect(c2).toContain("'기준표'!$A$2:$A$3");
    expect((c2.match(/<c:ser>/g) ?? []).length).toBe(5);
  });

  it("그래프가 들어 있어도 이 앱이 지난 차수 표로 다시 읽을 수 있다", async () => {
    const bytes = await writeReport(table);
    const report = await readReport(bytes);
    expect(report.rows.map((r) => r.ministry)).toEqual(["해수부", "산림청"]);
    expect(report.rows[0].cells.신규지정).toEqual(num(3));
  });

  it("부처가 없으면 그래프를 넣지 않는다", async () => {
    const p = await parts(await writeReport(buildTable([]).table));
    expect(p.names.some((n) => n.startsWith("xl/charts/"))).toBe(false);
  });
});

describe("비교표 엑셀의 그래프", () => {
  it("구분별 합계 숫자표를 표 아래에 적고, 지난 차수와 이번 차수를 견주는 그래프를 넣는다", async () => {
    const bytes = await writeComparison(compareTables(table, previous), "4차", "3차");
    const p = await parts(bytes);
    expect(p.names).toContain("xl/charts/chart1.xml");
    const chart = await p.read("xl/charts/chart1.xml");
    expect(chart).toContain("구분별 합계: 3차 → 4차");
    expect(chart).toContain('<c:grouping val="clustered"/>');
    // 지난 합계 신규지정 1+4=5, 이번 3+5=8
    expect(chart).toContain("<c:v>5</c:v>");
    expect(chart).toContain("<c:v>8</c:v>");
    // 숫자표가 같은 시트 아래쪽에 있다.
    const strings = await p.read("xl/sharedStrings.xml");
    expect(strings).toContain("구분별 합계");
    expect(strings).toContain("3차");
    expect(strings).toContain("4차");
  });

  it("합계가 '확인 필요'이면 비교 그래프를 만들지 않는다", async () => {
    const withCheck = buildTable([file("해수부", "신규지정", { kind: "check" })]).table;
    const p = await parts(await writeComparison(compareTables(withCheck, previous), "4차", "3차"));
    expect(p.names.some((n) => n.startsWith("xl/charts/"))).toBe(false);
  });
});
