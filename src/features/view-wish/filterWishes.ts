import { z } from 'zod';
import { PAPER_COLORS, WISH_CATEGORIES, type PaperColor, type Wish, type WishCategory } from '@/entities/wish';
import { normalizeVi, truncateGraphemes } from '@/shared/lib/text';

export type WishSortOrder = 'newest' | 'oldest' | 'author-asc';

export interface WishFilter {
  query: string;
  categories: WishCategory[];
  paperColors: PaperColor[];
  sources: Wish['source'][];
  sort: WishSortOrder;
}

export const DEFAULT_FILTER: WishFilter = { query: '', categories: [], paperColors: [], sources: [], sort: 'newest' };
export const MAX_QUERY = 100;

export const WishFilterSchema = z.object({
  query: z.string().max(MAX_QUERY),
  categories: z.array(z.enum(WISH_CATEGORIES)),
  paperColors: z.array(z.enum(PAPER_COLORS)),
  sources: z.array(z.enum(['local', 'shared'])),
  sort: z.enum(['newest', 'oldest', 'author-asc']),
});

export function isFilterActive(f: WishFilter): boolean {
  return f.query.trim() !== '' || f.categories.length > 0 || f.paperColors.length > 0 || f.sources.length > 0;
}

const collator = new Intl.Collator('vi', { sensitivity: 'base' });

/** Lọc (AND giữa nhóm, OR trong nhóm) và sắp xếp (FR-004-06..08). */
export function filterWishes(wishes: readonly Wish[], f: WishFilter): Wish[] {
  const q = normalizeVi(truncateGraphemes(f.query, MAX_QUERY));
  const out = wishes.filter(
    (w) =>
      (q === '' || normalizeVi(w.content).includes(q) || normalizeVi(w.author).includes(q)) &&
      (f.categories.length === 0 || f.categories.includes(w.category)) &&
      (f.paperColors.length === 0 || f.paperColors.includes(w.paperColor)) &&
      (f.sources.length === 0 || f.sources.includes(w.source)),
  );
  switch (f.sort) {
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'author-asc':
      return out.sort((a, b) => collator.compare(a.author, b.author));
  }
}

/** Mục liền kề theo vòng tròn (FR-004-04). */
export function getAdjacentWishId(list: readonly Wish[], currentId: string, dir: 'prev' | 'next'): string | null {
  if (list.length === 0) return null;
  const i = list.findIndex((w) => w.id === currentId);
  if (i === -1) return list[0]?.id ?? null;
  const j = (i + (dir === 'next' ? 1 : -1) + list.length) % list.length;
  return list[j]?.id ?? null;
}

export function formatWishDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
