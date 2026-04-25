import { getDb } from '../db/database.js';

function ensureProgressSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      date TEXT PRIMARY KEY,
      cards_created INTEGER DEFAULT 0,
      cards_reviewed INTEGER DEFAULT 0,
      notes_created INTEGER DEFAULT 0,
      study_minutes INTEGER DEFAULT 0
    )
  `);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function recordActivity(type: 'cards_created' | 'cards_reviewed' | 'notes_created', count = 1): void {
  ensureProgressSchema();
  const db = getDb();
  const today = getToday();
  const stmt = db.prepare(`
    INSERT INTO daily_progress (date, ${type})
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET ${type} = ${type} + excluded.${type}
  `);
  stmt.run(today, count);
}

export function recordCardCreated(): void {
  recordActivity('cards_created');
}

export function recordCardReviewed(): void {
  recordActivity('cards_reviewed');
}

export function recordNoteCreated(): void {
  recordActivity('notes_created');
}
