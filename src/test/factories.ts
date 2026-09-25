import type { Wish, WishDraft } from '@/entities/wish';

let n = 0;

export function makeDraft(o: Partial<WishDraft> = {}): WishDraft {
  return { content: 'Cả nhà mạnh khoẻ', author: 'Lan', category: 'family', paperColor: 'red', ...o };
}

export function makeWish(o: Partial<Wish> = {}): Wish {
  n++;
  const ts = new Date(Date.UTC(2026, 8, 1, 0, 0, n)).toISOString();
  return {
    ...makeDraft(),
    id: crypto.randomUUID(),
    slotId: `slot-${String(n % 100 || 100).padStart(3, '0')}`,
    source: 'local',
    createdAt: ts,
    updatedAt: ts,
    ...o,
  };
}
