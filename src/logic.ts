// Rules for the hydration plugin, as plain functions, so they can be tested without the app.
export type GlassesByDay = Record<string, number>;

// A day key such as 2026-10-24, in local time.
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const addDays = (date: Date, n: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// The streak is the run of days that reached the goal, counted back from today.
// Today only counts once the goal is reached; until then the streak is read from yesterday.
// A streak can survive one missed day (a recovery day). A second missed day in a row ends it.
export const streak = (glassesByDay: GlassesByDay, goal: number, today: Date): number => {
  const met = (day: Date) => (glassesByDay[dayKey(day)] || 0) >= goal;
  let count = met(today) ? 1 : 0;
  let forgiven = false;
  let misses = 0;
  for (let i = 1; i < 366; i++) {
    const day = addDays(today, -i);
    if (met(day)) {
      count++;
      misses = 0;
    } else if (!forgiven && misses === 0 && count > 0) {
      forgiven = true;
      misses = 1;
    } else {
      break;
    }
  }
  return count;
};

// The glasses for the last seven days, oldest first, for the small chart.
export const lastDays = (glassesByDay: GlassesByDay, today: Date) =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, glasses: glassesByDay[dayKey(date)] || 0 };
  });

// Keeps only the days from the last 400 days, so storage does not grow for ever.
export const prune = (glassesByDay: GlassesByDay, today: Date): GlassesByDay => {
  const cutoff = dayKey(addDays(today, -400));
  return Object.fromEntries(Object.entries(glassesByDay).filter(([day]) => day >= cutoff));
};
