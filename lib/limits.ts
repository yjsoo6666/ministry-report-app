// 보안: 이상하게 큰 파일이 브라우저 탭을 멈추게 하지 못하도록 정한 한도.
// 정상 부처 문서(.hwpx)는 보통 몇 MB 이하이고, 본문 XML은 1MB도 안 된다.

// 올릴 수 있는 파일 하나의 최대 크기 (한글 파일, 지난 분기 엑셀 모두)
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// 압축 파일(.hwpx, .xlsx) 안의 항목 개수 최대치
export const MAX_ZIP_ENTRIES = 5000;

// .hwpx에서 읽는 본문(section) 파일의 개수와, 하나를 풀었을 때의 최대 크기
export const MAX_SECTIONS = 50;
export const MAX_SECTION_BYTES = 30 * 1024 * 1024;

// .xlsx를 풀었을 때 전체 크기, 그리고 읽을 표의 최대 줄 수
export const MAX_XLSX_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_REPORT_ROWS = 10000;

export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);
