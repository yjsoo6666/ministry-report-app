import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { writeReport, CHECK_TEXT } from "../lib/excel/writeReport";
import { buildTable } from "../lib/table/buildTable";
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

async function readBack(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  return workbook.getWorksheet("기준표")!;
}

describe("writeReport", () => {
  const files = [
    file("1", "조달청", "신규지정", num(80)),
    file("2", "조달청", "1차연장", num(26)),
    file("3", "조달청", "2차연장", num(19)),
    file("4", "해수부", "신규지정", num(1)),
    file("5", "해수부", "1차연장", EMPTY),
    file("6", "행안부", "2차연장", CHECK),
  ];

  it("머리글 줄에 5개 구분이 예시 기준표와 같은 이름으로 들어간다", async () => {
    const sheet = await readBack(await writeReport(buildTable(files).table));
    const headers = [2, 3, 4, 5, 6].map((c) => sheet.getRow(1).getCell(c).value);
    expect(headers).toEqual(["신규 지정", "1차 연장", "2차 연장", "지정취소", "규격추가"]);
  });

  it("부처 줄이 올린 순서대로 들어가고 숫자가 맞는 칸에 있다", async () => {
    const sheet = await readBack(await writeReport(buildTable(files).table));
    expect(sheet.getRow(2).getCell(1).value).toBe("조달청");
    expect(sheet.getRow(2).getCell(2).value).toBe(80);
    expect(sheet.getRow(2).getCell(3).value).toBe(26);
    expect(sheet.getRow(2).getCell(4).value).toBe(19);
    expect(sheet.getRow(3).getCell(1).value).toBe("해수부");
    expect(sheet.getRow(3).getCell(2).value).toBe(1);
    expect(sheet.getRow(4).getCell(1).value).toBe("행안부");
  });

  it("빈칸은 비어 있고, 확인 필요는 글자로 들어간다", async () => {
    const sheet = await readBack(await writeReport(buildTable(files).table));
    expect(sheet.getRow(3).getCell(3).value).toBeNull(); // 해수부 1차 연장: 빈칸
    expect(sheet.getRow(3).getCell(5).value).toBeNull();
    expect(sheet.getRow(4).getCell(4).value).toBe(CHECK_TEXT);
  });

  it("맨 아래 계 줄이 구분별 합이고, 확인 필요가 섞인 구분은 확인 필요다", async () => {
    const sheet = await readBack(await writeReport(buildTable(files).table));
    const total = sheet.getRow(5); // 부처 3곳 + 머리글 1줄 다음
    expect(total.getCell(1).value).toBe("계");
    expect(total.getCell(2).value).toBe(81);
    expect(total.getCell(3).value).toBe(26);
    expect(total.getCell(4).value).toBe(CHECK_TEXT);
    expect(total.getCell(5).value).toBe(0);
    expect(total.getCell(6).value).toBe(0);
  });

  it("부처가 늘면 줄도 늘고 계는 항상 맨 아래에 있다", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      file(`f${i}`, `부처${i}`, "신규지정", num(1)),
    );
    const sheet = await readBack(await writeReport(buildTable(many).table));
    expect(sheet.getRow(13).getCell(1).value).toBe("부처11");
    expect(sheet.getRow(14).getCell(1).value).toBe("계");
    expect(sheet.getRow(14).getCell(2).value).toBe(12);
    expect(sheet.rowCount).toBe(14);
  });

  it("머리글과 계 줄에 색이 들어가고 글꼴은 맑은 고딕이다", async () => {
    const sheet = await readBack(await writeReport(buildTable(files).table));
    const headerCell = sheet.getRow(1).getCell(2);
    const totalCell = sheet.getRow(5).getCell(2);
    expect(headerCell.font?.name).toBe("맑은 고딕");
    expect(headerCell.font?.bold).toBe(true);
    expect(headerCell.fill).toMatchObject({ type: "pattern", fgColor: { argb: "FFE6B8E6" } });
    expect(totalCell.fill).toMatchObject({ type: "pattern", fgColor: { argb: "FFC6E0B4" } });
  });

  it("부처가 하나도 없어도 머리글과 계 줄이 있는 파일을 만든다", async () => {
    const sheet = await readBack(await writeReport(buildTable([]).table));
    expect(sheet.getRow(2).getCell(1).value).toBe("계");
    expect(sheet.getRow(2).getCell(2).value).toBe(0);
  });
});
