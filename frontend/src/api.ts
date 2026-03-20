const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? res.statusText);
  }
  return res.json();
}

export type Card = {
  id: string;
  q: string;
  a: string;
  next_review: number;
  interval: number;
};

export type ListCardsRes = { success: boolean; cards: Card[]; count: number };
export type NextDueRes = { success: boolean; card: Card | null; due_count: number; total_count: number };
export type RateRes = { success: boolean; card: Card; interval_days: number; ef: number; next: NextDueRes | null };

export const api = {
  health: () => request<{ status: string }>('/health'),
  listCards: () => request<ListCardsRes>('/cards'),
  createCard: (q: string, a: string) => request<{ success: boolean; card: Card }>('/cards', { method: 'POST', body: JSON.stringify({ q, a }) }),
  deleteCard: (id: string) => request<{ success: boolean }>(`/cards/${id}`, { method: 'DELETE' }),
  nextDue: () => request<NextDueRes>('/review/next'),
  rateCard: (id: string, grade: 1 | 2 | 3) => request<RateRes>(`/review/${id}/rate`, { method: 'POST', body: JSON.stringify({ grade }) }),
  importTxt: (content: string) => request<{ success: boolean; count: number }>('/import/txt', { method: 'POST', body: JSON.stringify({ content }) }),
};