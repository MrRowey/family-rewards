/** Weekly recurring task eligibility using UK-local calendar dates. */
export function isAssignmentDue(
  assignment: { dayOfWeek: number; repeatInterval: number; startDate: Date; endDate: Date | null },
  forDate: Date,
): boolean {
  const day = Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth(), forDate.getUTCDate());
  const start = Date.UTC(assignment.startDate.getUTCFullYear(), assignment.startDate.getUTCMonth(), assignment.startDate.getUTCDate());
  if (day < start || assignment.dayOfWeek !== forDate.getUTCDay()) return false;
  if (assignment.endDate) {
    const end = Date.UTC(assignment.endDate.getUTCFullYear(), assignment.endDate.getUTCMonth(), assignment.endDate.getUTCDate());
    if (day > end) return false;
  }
  const interval = Math.max(1, assignment.repeatInterval);
  const startDayOfWeek = new Date(start).getUTCDay();
  const daysUntilFirst = (assignment.dayOfWeek - startDayOfWeek + 7) % 7;
  const firstDue = start + daysUntilFirst * 86400000;
  return day >= firstDue && Math.floor((day - firstDue) / (7 * 86400000)) % interval === 0;
}
