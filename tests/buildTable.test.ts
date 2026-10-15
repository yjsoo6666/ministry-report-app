import { describe, expect, it } from "vitest";
import { buildTable, computeTotals } from "../lib/table/buildTable";
import type { Category, Cell, ParsedFile, TableRow } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const EMPTY: Cell = { kind: "empty" };
const CHECK: Cell = { kind: "check" };

function file(
  fileName: string,
  ministry: string | null,
  category: Category | null,
  count: Cell,
): ParsedFile {
  return { fileName, ministry, category, count };
}

describe("buildTable", () => {
  it("파일이 없으면 부처가 없고 계는 모두 0이다", () => {
    const { table, excluded, issues } = buildTable([]);
    expect(table.rows).toEqual([]);
    expect(table.totals).toEqual({
      신규지정: num(0),
      "1차연장": num(0),
      "2차연장": num(0),
      지정취소: num(0),
      규격추가: num(0),
    });
    expect(excluded).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("파일 하나는 해당 부처·구분 칸에만 들어가고 나머지는 빈칸이다", () => {
    const { table } = buildTable([file("a.hwpx", "해수부", "신규지정", num(1))]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].ministry).toBe("해수부");
    expect(table.rows[0].cells).toEqual({
      신규지정: num(1),
      "1차연장": EMPTY,
      "2차연장": EMPTY,
      지정취소: EMPTY,
      규격추가: EMPTY,
    });
    expect(table.rows[0].edited).toEqual({});
  });

  it("같은 부처의 다른 구분 파일은 한 행으로 합친다", () => {
    const { table } = buildTable([
      file("a.hwpx", "행안부", "신규지정", num(2)),
      file("b.hwpx", "행안부", "2차연장", num(3)),
    ]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].cells.신규지정).toEqual(num(2));
    expect(table.rows[0].cells["2차연장"]).toEqual(num(3));
  });

  it("부처 행은 파일을 올린 순서(처음 나온 순서)대로 둔다", () => {
    const { table } = buildTable([
      file("1.hwpx", "조달청", "신규지정", num(1)),
      file("2.hwpx", "산림청", "신규지정", num(1)),
      file("3.hwpx", "조달청", "1차연장", num(1)),
      file("4.hwpx", "기상청", "신규지정", num(1)),
    ]);
    expect(table.rows.map((r) => r.ministry)).toEqual(["조달청", "산림청", "기상청"]);
  });

  it("계는 구분별로 위 칸의 숫자를 더한 값이고, 숫자가 없는 구분은 0이다", () => {
    const { table } = buildTable([
      file("1.hwpx", "조달청", "신규지정", num(80)),
      file("2.hwpx", "국토교통부", "신규지정", num(8)),
      file("3.hwpx", "해수부", "신규지정", num(1)),
      file("4.hwpx", "조달청", "2차연장", num(19)),
    ]);
    expect(table.totals.신규지정).toEqual(num(89));
    expect(table.totals["2차연장"]).toEqual(num(19));
    expect(table.totals["1차연장"]).toEqual(num(0));
    expect(table.totals.지정취소).toEqual(num(0));
  });

  it("빈칸(건수 없음)은 빈칸으로 남고 계에는 영향이 없다", () => {
    const { table } = buildTable([
      file("1.hwpx", "산림청", "1차연장", EMPTY),
      file("2.hwpx", "기후부", "1차연장", num(4)),
    ]);
    expect(table.rows[0].cells["1차연장"]).toEqual(EMPTY);
    expect(table.totals["1차연장"]).toEqual(num(4));
  });

  it("'확인 필요' 칸이 있는 구분의 계는 '확인 필요'이고 다른 구분은 영향이 없다", () => {
    const { table } = buildTable([
      file("1.hwpx", "행안부", "2차연장", CHECK),
      file("2.hwpx", "산업부", "2차연장", num(8)),
      file("3.hwpx", "행안부", "신규지정", num(1)),
    ]);
    expect(table.rows[0].cells["2차연장"]).toEqual(CHECK);
    expect(table.totals["2차연장"]).toEqual(CHECK);
    expect(table.totals.신규지정).toEqual(num(1));
  });

  it("같은 부처·같은 구분 파일이 둘 이상이면 합치지 않고 '확인 필요'로 두고 이유를 남긴다", () => {
    const { table, issues } = buildTable([
      file("결과.hwpx", "해수부", "2차연장", num(1)),
      file("결과(1).hwpx", "해수부", "2차연장", num(1)),
    ]);
    expect(table.rows[0].cells["2차연장"]).toEqual(CHECK);
    expect(table.totals["2차연장"]).toEqual(CHECK);
    expect(issues).toHaveLength(1);
    expect(issues[0].fileNames).toEqual(["결과.hwpx", "결과(1).hwpx"]);
    expect(issues[0].cell).toEqual({ ministry: "해수부", category: "2차연장" });
    expect(issues[0].message).toContain("해수부");
    expect(issues[0].message).toContain("2차연장");
  });

  it("숫자를 못 읽어 '확인 필요'가 된 칸은 이유를 확인 목록에도 남긴다", () => {
    const withReason: ParsedFile = {
      ...file("a.hwpx", "행안부", "2차연장", CHECK),
      problem: "건수 문구는 있는데 숫자를 읽지 못했어요.",
    };
    const withoutReason = file("b.hwpx", "해수부", "신규지정", CHECK);
    const { issues } = buildTable([withReason, withoutReason]);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual({
      fileNames: ["a.hwpx"],
      message: "건수 문구는 있는데 숫자를 읽지 못했어요.",
      cell: { ministry: "행안부", category: "2차연장" },
    });
    expect(issues[1].fileNames).toEqual(["b.hwpx"]);
    expect(issues[1].message).toContain("해수부");
  });

  it("부처명이나 구분을 못 읽은 파일은 표에 넣지 않고 제외 목록에 둔다", () => {
    const noMinistry = file("x.hwpx", null, "신규지정", num(5));
    const noCategory = file("y.hwpx", "해수부", null, num(5));
    const ok = file("z.hwpx", "산림청", "신규지정", num(1));
    const { table, excluded } = buildTable([noMinistry, noCategory, ok]);
    expect(excluded).toEqual([noMinistry, noCategory]);
    expect(table.rows.map((r) => r.ministry)).toEqual(["산림청"]);
    expect(table.totals.신규지정).toEqual(num(1));
  });

  it("입력 파일 목록을 바꾸지 않는다", () => {
    const files = [file("a.hwpx", "해수부", "신규지정", num(1))];
    const snapshot = JSON.parse(JSON.stringify(files));
    buildTable(files);
    expect(files).toEqual(snapshot);
  });

  it("사진 속 예시 기준표(일부)와 같은 계가 나온다", () => {
    // 조달청 80/26/19/3, 국토교통부 8, 해수부 1 등 예시 숫자 일부로 계를 확인
    const { table } = buildTable([
      file("1", "조달청", "신규지정", num(80)),
      file("2", "조달청", "1차연장", num(26)),
      file("3", "조달청", "2차연장", num(19)),
      file("4", "조달청", "지정취소", num(3)),
      file("5", "국토교통부", "신규지정", num(8)),
      file("6", "국토교통부", "2차연장", num(4)),
      file("7", "국토교통부", "규격추가", num(2)),
      file("8", "해수부", "신규지정", num(1)),
      file("9", "해수부", "2차연장", num(1)),
    ]);
    expect(table.totals.신규지정).toEqual(num(89));
    expect(table.totals["1차연장"]).toEqual(num(26));
    expect(table.totals["2차연장"]).toEqual(num(24));
    expect(table.totals.지정취소).toEqual(num(3));
    expect(table.totals.규격추가).toEqual(num(2));
  });
});

describe("computeTotals", () => {
  const row = (ministry: string, cells: Partial<Record<Category, Cell>>): TableRow => ({
    ministry,
    cells: {
      신규지정: EMPTY,
      "1차연장": EMPTY,
      "2차연장": EMPTY,
      지정취소: EMPTY,
      규격추가: EMPTY,
      ...cells,
    },
    edited: {},
  });

  it("담당자가 칸을 고친 뒤 다시 계산하면 계가 바뀐다", () => {
    const rows = [row("해수부", { 신규지정: num(1) }), row("산림청", { 신규지정: num(2) })];
    expect(computeTotals(rows).신규지정).toEqual(num(3));

    rows[1].cells.신규지정 = num(5);
    expect(computeTotals(rows).신규지정).toEqual(num(6));
  });

  it("'확인 필요' 칸을 숫자로 고치면 계가 숫자로 돌아온다", () => {
    const rows = [row("해수부", { 신규지정: CHECK }), row("산림청", { 신규지정: num(2) })];
    expect(computeTotals(rows).신규지정).toEqual(CHECK);

    rows[0].cells.신규지정 = num(1);
    expect(computeTotals(rows).신규지정).toEqual(num(3));
  });

  it("숫자를 지워 빈칸으로 되돌리면 계에서 빠진다", () => {
    const rows = [row("해수부", { 신규지정: num(4) }), row("산림청", { 신규지정: num(2) })];
    rows[0].cells.신규지정 = EMPTY;
    expect(computeTotals(rows).신규지정).toEqual(num(2));
  });
});
