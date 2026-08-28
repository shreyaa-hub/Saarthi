// Spacing a repeated assignment out across days.
//
// Kept separate from the server action so the date arithmetic — the only part
// with a way to be subtly wrong — can be tested without a database.
//
// Dates are advanced in UTC from the plain YYYY-MM-DD the clinician picked.
// Adding 86_400_000 milliseconds to a local Date is the obvious version and
// the broken one: across a daylight-saving boundary a "day" is 23 or 25 hours,
// so the run drifts and two sessions can land on the same date or skip one.
// Stepping UTC calendar days has no such boundary.
export function repeatDueDates(
  dueDate: string,
  occurrences: number,
  everyDays: number,
): (string | null)[] {
  if (!dueDate) return Array.from({ length: occurrences }, () => null);

  return Array.from({ length: occurrences }, (_, i) => {
    const d = new Date(`${dueDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * everyDays);
    return d.toISOString().slice(0, 10);
  });
}
