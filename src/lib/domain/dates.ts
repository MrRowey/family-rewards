/**
 * Returns today's date normalized to UTC midnight (YYYY-MM-DDT00:00:00.000Z)
 * to ensure consistent date queries regardless of server or client timezone drift.
 */
export function getTodayDate(): Date {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    return getTodayDate();
  }
  return new Date(Date.UTC(year, month - 1, day));
}