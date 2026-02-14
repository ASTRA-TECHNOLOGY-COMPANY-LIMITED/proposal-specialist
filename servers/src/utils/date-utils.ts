/**
 * YYYY-MM-DD -> yyyyMMddHHmm 변환
 */
export function toG2bDateFormat(date: string, time: string = '0000'): string {
  return date.replace(/-/g, '') + time;
}

/**
 * 기본 날짜 범위 (최근 30일)
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: toG2bDateFormat(formatDate(start)),
    end: toG2bDateFormat(formatDate(end), '2359'),
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
