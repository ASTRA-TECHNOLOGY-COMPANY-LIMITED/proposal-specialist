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

/**
 * 마감일 상태 정보
 */
export interface DeadlineInfo {
  isClosed: boolean;
  daysRemaining: number;
  deadlineStatus: 'expired' | 'urgent' | 'normal' | 'upcoming' | 'unknown';
}

/**
 * 마감일시 문자열로부터 마감 상태를 계산한다.
 *
 * @param deadlineStr - 마감일시 문자열 (예: "2026/02/28 18:00:00", "2026-03-15")
 * @returns 마감 상태 정보
 */
export function calcDeadlineInfo(deadlineStr: string | undefined | null): DeadlineInfo {
  if (!deadlineStr) {
    return { isClosed: false, daysRemaining: -1, deadlineStatus: 'unknown' };
  }

  // 다양한 날짜 형식 지원: "/" → "-" 치환 후 파싱
  const normalized = deadlineStr.replace(/\//g, '-');
  const deadline = new Date(normalized);

  if (isNaN(deadline.getTime())) {
    return { isClosed: false, daysRemaining: -1, deadlineStatus: 'unknown' };
  }

  // KST(UTC+9) 기준으로 계산 — API 마감일시는 한국 시간 기준
  const now = new Date();
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowKst = now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + KST_OFFSET_MS;
  const diffMs = deadline.getTime() - nowKst;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const daysRemaining = diffMs < 0
    ? Math.floor(diffMs / MS_PER_DAY)   // 마감: 음수 유지
    : diffMs < MS_PER_DAY
      ? 0                                // 24시간 미만: 당일 마감
      : Math.ceil(diffMs / MS_PER_DAY);

  if (diffMs < 0) {
    return { isClosed: true, daysRemaining, deadlineStatus: 'expired' };
  }
  if (daysRemaining <= 3) {
    return { isClosed: false, daysRemaining, deadlineStatus: 'urgent' };
  }
  if (daysRemaining < 14) {
    return { isClosed: false, daysRemaining, deadlineStatus: 'normal' };
  }
  return { isClosed: false, daysRemaining, deadlineStatus: 'upcoming' };
}
