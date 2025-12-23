/**
 * マレーシア時間（GMT+8）用のユーティリティ関数
 */

// マレーシアのタイムゾーン
export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

/**
 * 日付をマレーシア時間でフォーマット
 */
export function formatDateMY(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", {
    timeZone: MALAYSIA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 時刻をマレーシア時間でフォーマット（HH:MM形式）
 */
export function formatTimeMY(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("ja-JP", {
    timeZone: MALAYSIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 日付と時刻をマレーシア時間でフォーマット
 */
export function formatDateTimeMY(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("ja-JP", {
    timeZone: MALAYSIA_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * マレーシア時間での現在時刻を取得
 */
export function getNowMY(): Date {
  return new Date();
}

/**
 * マレーシア時間での年月日を取得
 */
export function getDatePartsMY(date: Date | string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MALAYSIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hours: getPart("hour"),
    minutes: getPart("minute"),
  };
}

/**
 * マレーシア時間での今日の日付を取得（時刻は00:00:00）
 */
export function getTodayMY(): Date {
  const parts = getDatePartsMY(new Date());
  return new Date(parts.year, parts.month - 1, parts.day);
}

/**
 * 2つの日付がマレーシア時間で同じ日かどうかを判定
 */
export function isSameDayMY(date1: Date | string, date2: Date | string): boolean {
  const parts1 = getDatePartsMY(date1);
  const parts2 = getDatePartsMY(date2);
  return (
    parts1.year === parts2.year &&
    parts1.month === parts2.month &&
    parts1.day === parts2.day
  );
}

/**
 * マレーシア時間でのフォーマット済み日付（YYYY/MM/DD形式）
 */
export function formatDateShortMY(date: Date | string): string {
  const parts = getDatePartsMY(date);
  return `${parts.year}/${parts.month.toString().padStart(2, "0")}/${parts.day.toString().padStart(2, "0")}`;
}

/**
 * マレーシア時間でのフォーマット済み時刻（HH:MM形式）
 */
export function formatTimeShortMY(date: Date | string): string {
  const parts = getDatePartsMY(date);
  return `${parts.hours.toString().padStart(2, "0")}:${parts.minutes.toString().padStart(2, "0")}`;
}
