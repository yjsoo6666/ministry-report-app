import JSZip from "jszip";

// 시험용 가짜 .hwpx: 본문 XML(Contents/section0.xml 등)만 들어 있는 압축 파일.
// 실제 부처 파일이 아니라, 사진 속 문서의 글자를 흉내 낸 것이다.
export async function makeHwpx(sections: string[][]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip");
  sections.forEach((paragraphs, i) => {
    const body = paragraphs
      .map((text) => `<hp:p><hp:run><hp:t>${text}</hp:t></hp:run></hp:p>`)
      .join("");
    zip.file(`Contents/section${i}.xml`, `<hs:sec>${body}</hs:sec>`);
  });
  return zip.generateAsync({ type: "uint8array" });
}
