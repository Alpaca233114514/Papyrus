import type { FastifyInstance } from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { paths } from '../../utils/paths.js';
import { recordCardCreated, recordCardReviewed, recordNoteCreated } from '../../core/progress.js';

function getProgressDb(): DatabaseSync {
  const db = new DatabaseSync(paths.dbFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      date TEXT PRIMARY KEY,
      cards_created INTEGER DEFAULT 0,
      cards_reviewed INTEGER DEFAULT 0,
      notes_created INTEGER DEFAULT 0,
      study_minutes INTEGER DEFAULT 0
    )
  `);
  return db;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/streak', async (_request, reply) => {
    const db = getProgressDb();
    const today = getToday();

    const stmt = db.prepare('SELECT * FROM daily_progress ORDER BY date DESC');
    const rows = stmt.all() as Array<{ date: string; cards_reviewed: number }>;
    db.close();

    const todayRow = rows.find(r => r.date === today);
    const todayCompleted = (todayRow?.cards_reviewed ?? 0) > 0;
    const todayCards = todayRow?.cards_reviewed ?? 0;

    let currentStreak = 0;
    const checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const row = rows.find(r => r.date === dateStr);
      if ((row?.cards_reviewed ?? 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    for (const row of sortedRows) {
      if (row.cards_reviewed > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const dailyTarget = 20;
    const progressPercent = Math.min(100, Math.round((todayCards / dailyTarget) * 100));

    reply.send({
      success: true,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_days: rows.length,
      today_completed: todayCompleted,
      today_cards: todayCards,
      daily_target: dailyTarget,
      progress_percent: progressPercent,
    });
  });

  fastify.get('/history', async (request, reply) => {
    const { days = '30' } = request.query as { days?: string };
    const parsedDays = parseInt(days, 10);
    const numDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30;
    const db = getProgressDb();
    const stmt = db.prepare('SELECT * FROM daily_progress ORDER BY date DESC LIMIT ?');
    const rows = stmt.all(numDays) as Array<{
      date: string;
      cards_created: number;
      cards_reviewed: number;
      notes_created: number;
      study_minutes: number;
    }>;
    db.close();

    reply.send({
      success: true,
      history: rows.map(r => ({
        date: r.date,
        cards_created: r.cards_created,
        cards_reviewed: r.cards_reviewed,
        notes_created: r.notes_created,
        study_minutes: r.study_minutes,
      })),
      days: numDays,
    });
  });

  fastify.get('/heatmap', async (request, reply) => {
    const { days = '365' } = request.query as { days?: string };
    const parsedDays = parseInt(days, 10);
    const numDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 365;
    const db = getProgressDb();
    const stmt = db.prepare('SELECT * FROM daily_progress ORDER BY date DESC LIMIT ?');
    const rows = stmt.all(numDays) as Array<{ date: string; cards_reviewed: number }>;
    db.close();

    const data = rows.map(r => {
      const count = r.cards_reviewed;
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 5) level = 2;
      if (count >= 15) level = 3;
      return { date: r.date, count, level };
    });

    const totalCards = rows.reduce((sum, r) => sum + r.cards_reviewed, 0);

    reply.send({
      success: true,
      data,
      total_days: numDays,
      total_cards: totalCards,
    });
  });
}
