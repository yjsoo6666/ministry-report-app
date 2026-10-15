import { describe, expect, it } from "vitest";
import { buildTable } from "../lib/table/buildTable";
import { applyEdit, parseCellInput } from "../lib/table/editTable";
import type { Cell, ParsedFile } from "../lib/types";

const num = (value: number): Cell => ({ kind: "number", value });
const EMPTY: Cell = { kind: "empty" };
const CHECK: Cell = { kind: "check" };

const file = (
  fileName: string,
  ministry: string,
  category: ParsedFile["category"],
  count: Cell,
): ParsedFile => ({ fileName, ministry, category, count });

function sampleTable() {
  return buildTable([
    file("1", "해수부", "신규지정", num(1)),
    file("2", "행안부", "신규지정", num(2)),
    file("3", "행안부", "2차연장", CHECK),
  ]).table;
}

describe("parseCellInput", () => {
  it("숫자 글자는 숫자 칸이 된다", () => {
    expect(parseCellInput("5")).toEqual(num(5));
    expect(parseCellInput(" 12 ")).toEqual(num(12));
    expect(parseCellInput("0")).toEqual(num(0));
  });

  it("빈 글자나 공백은 빈칸으로 되돌린다", () => {
    expect(parseCellInput("")).toEqual(EMPTY);
    expect(parseCellInput("   ")).toEqual(EMPTY);
  });

  it("숫자가 아닌 입력은 받아들이지 않는다", () => {
    expect(parseCellInput("abc")).toBeNull();
    expect(parseCellInput("-3")).toBeNull();
    expect(parseCellInput("1.5")).toBeNull();
    expect(parseCellInput("1 2")).toBeNull();
  });
});

describe("applyEdit", () => {
  it("칸을 고치면 그 칸이 바뀌고 고친 칸으로 표시되며 계가 다시 계산된다", () => {
    const table = applyEdit(sampleTable(), "해수부", "신규지정", num(10));
    const row = table.rows.find((r) => r.ministry === "해수부")!;
    expect(row.cells.신규지정).toEqual(num(10));
    expect(row.edited.신규지정).toBe(true);
    expect(table.totals.신규지정).toEqual(num(12));
  });

  it("빈칸에 숫자를 넣을 수 있다", () => {
    const table = applyEdit(sampleTable(), "해수부", "1차연장", num(4));
    const row = table.rows.find((r) => r.ministry === "해수부")!;
    expect(row.cells["1차연장"]).toEqual(num(4));
    expect(table.totals["1차연장"]).toEqual(num(4));
  });

  it("숫자를 지워 빈칸으로 되돌리면 계에서 빠진다", () => {
    const table = applyEdit(sampleTable(), "행안부", "신규지정", EMPTY);
    expect(table.totals.신규지정).toEqual(num(1));
  });

  it("'확인 필요' 칸을 숫자로 고치면 그 구분의 계가 숫자로 돌아온다", () => {
    const before = sampleTable();
    expect(before.totals["2차연장"]).toEqual(CHECK);
    const after = applyEdit(before, "행안부", "2차연장", num(3));
    expect(after.totals["2차연장"]).toEqual(num(3));
  });

  it("값이 그대로면 표도 고친 칸 표시도 바꾸지 않는다", () => {
    const before = sampleTable();
    const after = applyEdit(before, "해수부", "신규지정", num(1));
    expect(after).toBe(before);
    expect(after.rows[0].edited).toEqual({});
  });

  it("없는 부처를 고치려 하면 표를 그대로 돌려준다", () => {
    const before = sampleTable();
    expect(applyEdit(before, "없는부처", "신규지정", num(1))).toBe(before);
  });

  it("원래 표를 바꾸지 않는다", () => {
    const before = sampleTable();
    const snapshot = JSON.parse(JSON.stringify(before));
    applyEdit(before, "해수부", "신규지정", num(99));
    expect(before).toEqual(snapshot);
  });
});
