// Study days roll over at 04:00 local time (specification.md section 4).

export const ROLLOVER_HOUR = 4;

/** Start of the study day containing `now`: today at 04:00, or yesterday at 04:00 before 04:00. */
export function dayStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(ROLLOVER_HOUR, 0, 0, 0);
  if (now < start) start.setDate(start.getDate() - 1);
  return start;
}

/** Start of the next study day. Uses calendar arithmetic, so DST changes are handled. */
export function nextDayStart(now: Date): Date {
  const next = dayStart(now);
  next.setDate(next.getDate() + 1);
  return next;
}

/** A stable key for the study day, e.g. "2026-11-08", used to seed the daily new-card order. */
export function dayKey(now: Date): string {
  const start = dayStart(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}
