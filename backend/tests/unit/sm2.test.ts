import { applySm2, type CardState } from '../../src/core/sm2.js';

describe('SM-2 Algorithm', () => {
  it('should reset card on grade 1 (forget)', () => {
    const card: CardState = { ef: 2.5, repetitions: 5, interval: 86400 };
    const result = applySm2(card, 1, 1000);

    expect(result.intervalDays).toBe(1.0);
    expect(card.repetitions).toBe(0);
    expect(card.ef).toBeLessThan(2.5);
  });

  it('should set 1 day interval on first successful review (grade 3)', () => {
    const card: CardState = { ef: 2.5, repetitions: 0 };
    const result = applySm2(card, 3, 1000);

    expect(result.intervalDays).toBe(1.0);
    expect(card.repetitions).toBe(1);
    expect(card.ef).toBeGreaterThanOrEqual(1.3);
  });

  it('should set 6 day interval on second successful review (grade 3)', () => {
    const card: CardState = { ef: 2.5, repetitions: 1 };
    const result = applySm2(card, 3, 1000);

    expect(result.intervalDays).toBe(6.0);
    expect(card.repetitions).toBe(2);
  });

  it('should increase interval on third successful review (grade 3)', () => {
    const card: CardState = { ef: 2.5, repetitions: 2, interval: 6 * 86400 };
    const result = applySm2(card, 3, 1000);

    expect(result.intervalDays).toBeGreaterThan(6);
    expect(card.repetitions).toBe(3);
  });

  it('should not let ef drop below 1.3', () => {
    const card: CardState = { ef: 1.3, repetitions: 2, interval: 86400 };
    applySm2(card, 1, 1000);

    expect(card.ef).toBe(1.3);
  });

  it('should update next_review timestamp', () => {
    const now = 1000000;
    const card: CardState = {};
    applySm2(card, 3, now);

    expect(card.next_review).toBeGreaterThan(now);
  });
});
