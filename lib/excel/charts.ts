// 엑셀 파일에 막대그래프를 넣는다.
// 엑셀 도구(ExcelJS)는 그래프를 만들 수 없어서, 만들어진 .xlsx(압축 파일)에 그래프 부품(XML)을 직접 끼워 넣는다.
// - 그래프는 시트 안의 칸 값을 그대로 가리킨다. 칸 숫자를 고치면 그래프도 바뀐다.
// - 그래프는 칸이 아니라 시트 위에 떠 있는 그림이라서, 이 앱이 지난 차수 기준표를 다시 읽을 때 영향이 없다.

import JSZip from "jszip";

export interface ChartSeries {
  // 계열 이름: 칸을 가리키거나(nameRef), 글자를 직접 쓴다(name)
  name?: string;
  nameRef?: string;
  categoriesRef: string; // 가로축 이름이 있는 칸 범위. 예: '기준표'!$B$1:$F$1
  valuesRef: string; // 숫자가 있는 칸 범위
  categories: string[]; // 위 범위의 값 (그래프에 미리 저장해 두는 값)
  values: (number | null)[];
  color: string; // 6자리 16진수 색. 예: 4472C4
}

export interface ChartSpec {
  title: string;
  kind: "clustered" | "stacked";
  series: ChartSeries[];
  // 그래프가 놓일 칸 범위 (0부터 센다)
  from: { col: number; row: number };
  to: { col: number; row: number };
  showValues?: boolean; // 막대 위에 숫자를 보여 줄지
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 시트 이름을 칸 범위에 쓸 때 작은따옴표로 감싼다. 예: '기준표'!$B$1:$F$1
export function sheetRef(sheetName: string, range: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

function strRef(formula: string, values: string[]): string {
  const points = values.map((v, i) => `<c:pt idx="${i}"><c:v>${escapeXml(v)}</c:v></c:pt>`).join("");
  return `<c:strRef><c:f>${escapeXml(formula)}</c:f><c:strCache><c:ptCount val="${values.length}"/>${points}</c:strCache></c:strRef>`;
}

function numRef(formula: string, values: (number | null)[]): string {
  const points = values
    .map((v, i) => (v === null ? "" : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`))
    .join("");
  return `<c:numRef><c:f>${escapeXml(formula)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${points}</c:numCache></c:numRef>`;
}

function seriesXml(series: ChartSeries, index: number, showValues: boolean): string {
  const tx = series.nameRef
    ? `<c:tx>${strRef(series.nameRef, [series.name ?? ""])}</c:tx>`
    : `<c:tx><c:v>${escapeXml(series.name ?? "")}</c:v></c:tx>`;
  const labels = showValues
    ? `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`
    : "";
  return (
    `<c:ser><c:idx val="${index}"/><c:order val="${index}"/>${tx}` +
    `<c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></c:spPr>` +
    `<c:invertIfNegative val="0"/>${labels}` +
    `<c:cat>${strRef(series.categoriesRef, series.categories)}</c:cat>` +
    `<c:val>${numRef(series.valuesRef, series.values)}</c:val></c:ser>`
  );
}

export function chartXml(spec: ChartSpec): string {
  const stacked = spec.kind === "stacked";
  const series = spec.series.map((s, i) => seriesXml(s, i, spec.showValues === true)).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>` +
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="ko-KR" sz="1200" b="1"/><a:t>${escapeXml(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea><c:layout/>` +
    `<c:barChart><c:barDir val="col"/><c:grouping val="${stacked ? "stacked" : "clustered"}"/><c:varyColors val="0"/>` +
    series +
    `<c:gapWidth val="80"/>${stacked ? '<c:overlap val="100"/>' : ""}` +
    `<c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>` +
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="222222222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="111111111"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `</c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>` +
    `<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>` +
    `</c:chart></c:chartSpace>`
  );
}

function drawingXml(specs: ChartSpec[]): string {
  const anchors = specs
    .map(
      (spec, i) =>
        `<xdr:twoCellAnchor>` +
        `<xdr:from><xdr:col>${spec.from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${spec.to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${spec.to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${escapeXml(`그래프 ${i + 1}`)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic>` +
        `</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`;
}

const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const SHEET_PATH = "xl/worksheets/sheet1.xml";
const SHEET_RELS_PATH = "xl/worksheets/_rels/sheet1.xml.rels";

// 만들어진 .xlsx(한 시트짜리)의 첫 시트에 그래프를 넣어 새 .xlsx 바이트를 돌려준다.
export async function addCharts(xlsx: Uint8Array, specs: ChartSpec[]): Promise<Uint8Array> {
  if (specs.length === 0) return xlsx;
  const zip = await JSZip.loadAsync(xlsx);

  // 1) 그래프·그림 부품 파일
  zip.file("xl/drawings/drawing1.xml", drawingXml(specs));
  zip.file(
    "xl/drawings/_rels/drawing1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}">` +
      specs
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`,
        )
        .join("") +
      `</Relationships>`,
  );
  specs.forEach((spec, i) => zip.file(`xl/charts/chart${i + 1}.xml`, chartXml(spec)));

  // 2) 파일 종류 목록에 새 부품을 알린다.
  const typesFile = zip.file("[Content_Types].xml");
  if (!typesFile) throw new Error("엑셀 파일 구조를 읽지 못했어요.");
  const types = await typesFile.async("string");
  const overrides =
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` +
    specs
      .map(
        (_, i) =>
          `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      )
      .join("");
  zip.file("[Content_Types].xml", types.replace("</Types>", `${overrides}</Types>`));

  // 3) 시트가 그림 부품을 가리키게 한다.
  const drawingRel = `<Relationship Id="rIdDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
  const relsFile = zip.file(SHEET_RELS_PATH);
  if (relsFile) {
    const rels = await relsFile.async("string");
    zip.file(SHEET_RELS_PATH, rels.replace("</Relationships>", `${drawingRel}</Relationships>`));
  } else {
    zip.file(
      SHEET_RELS_PATH,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}">${drawingRel}</Relationships>`,
    );
  }

  const sheetFile = zip.file(SHEET_PATH);
  if (!sheetFile) throw new Error("엑셀 시트를 찾지 못했어요.");
  let sheet = await sheetFile.async("string");
  // 시트 XML이 관계 이름공간(r:)을 쓸 수 있게 하고, <drawing>을 시트 맨 끝에 둔다.
  if (!/xmlns:r=/.test(sheet.slice(0, 600))) {
    sheet = sheet.replace(
      "<worksheet ",
      '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
    );
  }
  sheet = sheet.replace("</worksheet>", '<drawing r:id="rIdDrawing1"/></worksheet>');
  zip.file(SHEET_PATH, sheet);

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
