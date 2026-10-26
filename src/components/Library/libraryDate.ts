/*
 * 장본 음식의 유통기한 날짜("YYYY-MM-DD")를 만들고 화면용 문구로 바꾼다.
 */

// toISOString()은 UTC 기준이라 한국 시간 새벽에는 하루 전 날짜가 나와서 지역 날짜로 만든다.
export function getDateAfter(days: number) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// "2026-10-28" → "10월 28일". 기본 유통기한이 1년 가까이 되면 해가 넘어가므로 올해가 아니면 연도를 붙인다.
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const yearText = year === new Date().getFullYear() ? "" : `${year}년 `;
  return `${yearText}${month}월 ${day}일`;
}
