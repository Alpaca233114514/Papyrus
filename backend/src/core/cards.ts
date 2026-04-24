import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
import {
  loadAllCards,
  saveAllCards,
  insertCard as dbInsertCard,
  deleteCardById,
  getCardById,
  updateCard as dbUpdateCard,
  getCardsDueBefore,
  getCardCount,
} from '../db/database.js';
import { applySm2 } from './sm2.js';
import type { CardRecord } from './types.js';
import type { PapyrusLogger } from '../utils/logger.js';

const cardMutex = new Mutex();

export function getAllCards(logger?: PapyrusLogger): CardRecord[] {
  return loadAllCards(logger);
}

export function createCard(
  q: string,
  a: string,
  tags: string[] = [],
  logger?: PapyrusLogger,
): CardRecord {
  const card: CardRecord = {
    id: uuidv4().replace(/-/g, ''),
    q,
    a,
    next_review: Date.now() / 1000,
    interval: 0,
    ef: 2.5,
    repetitions: 0,
    tags,
  };

  dbInsertCard(card, logger);
  logger?.info(`创建卡片: ${card.id}`);
  return card;
}

export async function updateCard(
  cardId: string,
  updates: Partial<Pick<CardRecord, 'q' | 'a' | 'tags'>>,
  logger?: PapyrusLogger,
): Promise<CardRecord | null> {
  return cardMutex.runExclusive(() => {
    const card = getCardById(cardId);
    if (!card) return null;

    if (updates.q !== undefined) card.q = updates.q;
    if (updates.a !== undefined) card.a = updates.a;
    if (updates.tags !== undefined) card.tags = updates.tags;

    dbUpdateCard(card, logger);
    return card;
  });
}

export function deleteCard(cardId: string, logger?: PapyrusLogger): boolean {
  return deleteCardById(cardId, logger);
}

export function getNextDueCard(_logger?: PapyrusLogger): CardRecord | null {
  const now = Date.now() / 1000;
  const due = getCardsDueBefore(now);
  if (due.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * due.length);
  return due[randomIndex] ?? null;
}

export async function rateCard(
  cardId: string,
  grade: number,
  logger?: PapyrusLogger,
): Promise<{ card: CardRecord; intervalDays: number; ef: number } | null> {
  return cardMutex.runExclusive(() => {
    const card = getCardById(cardId);
    if (!card) return null;

    const { intervalDays, ef } = applySm2(card, grade);
    dbUpdateCard(card, logger);

    logger?.info(`复习卡片: ${cardId}, 评级: ${grade}, 间隔: ${intervalDays.toFixed(1)}天`);
    return { card, intervalDays, ef };
  });
}

export function importCardsFromTxt(content: string, logger?: PapyrusLogger): CardRecord[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const cards: CardRecord[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const q = parts[0]?.trim() ?? '';
      const a = parts[1]?.trim() ?? '';
      const tags = parts.length > 2 ? parts[2]?.split(',').map(t => t.trim()).filter(Boolean) ?? [] : [];
      cards.push(createCard(q, a, tags, logger));
    }
  }

  logger?.info(`从文本导入 ${cards.length} 张卡片`);
  return cards;
}

export function getCardStats(): { total: number; due: number } {
  const now = Date.now() / 1000;
  return {
    total: getCardCount(),
    due: getCardsDueBefore(now).length,
  };
}
