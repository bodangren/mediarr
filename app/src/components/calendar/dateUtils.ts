export interface LocalDateParts {
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
}

export function toLocalDateKey(date: LocalDateParts): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarFetchRange(year: number, month: number): { start: string; end: string } {
  const startDate = new Date(year, month, 1);
  const startDayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  const endDate = new Date(year, month + 1, 0);
  const endDayOfWeek = endDate.getDay();
  endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

  return {
    start: toLocalDateKey(startDate),
    end: toLocalDateKey(endDate),
  };
}
