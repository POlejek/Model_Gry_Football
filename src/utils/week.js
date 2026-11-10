// Monday (ISO date) of the week a date belongs to; an empty date has no week.
export function weekStart(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
