export interface CardState {
  ef?: number;
  repetitions?: number;
  interval?: number;
  next_review?: number;
}

export function applySm2(card: CardState, grade: number, now?: number): { intervalDays: number; ef: number } {
  const currentTimestamp = now ?? Date.now() / 1000;

  const efRaw = card.ef;
  let ef = typeof efRaw === 'number' ? efRaw : 2.5;

  const repRaw = card.repetitions;
  let repetitions = typeof repRaw === 'number' ? Math.floor(repRaw) : 0;

  const qualityMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  const quality = qualityMap[grade] ?? 3;

  let intervalDays: number;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalDays = 1.0;
    } else if (repetitions === 1) {
      intervalDays = 6.0;
    } else {
      const intervalRaw = card.interval;
      const intervalVal = typeof intervalRaw === 'number' ? intervalRaw : 86400.0;
      intervalDays = (intervalVal / 86400.0) * ef;
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1.0;
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, ef);

  const intervalSeconds = intervalDays * 86400.0;
  card.next_review = currentTimestamp + intervalSeconds;
  card.interval = intervalSeconds;
  card.ef = Math.round(ef * 100) / 100;
  card.repetitions = repetitions;

  return { intervalDays, ef };
}
