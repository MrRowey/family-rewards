/**
 * Returns today's date normalized to UTC midnight (YYYY-MM-DDT00:00:00.000Z)
 * to ensure consistent date queries regardless of server or client timezone drift.
 */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    return getTodayDate();
  }
  return new Date(Date.UTC(year, month - 1, day));
}