import { z } from 'zod';
import { PAPER_COLORS, STORAGE_KEYS, WISH_CATEGORIES, type WishDraft } from '@/entities/wish';
import { readJson, removeKey, writeRaw } from '@/shared/lib/storage';

const DraftShape = z
  .object({
    content: z.string().max(2000),
    author: z.string().max(200),
    category: z.enum(WISH_CATEGORIES),
    paperColor: z.enum(PAPER_COLORS),
  })
  .partial();

let warned = false;

/** Lưu bản nháp form (FR-002-11/12). */
export const draftStorage = {
  load(): Partial<WishDraft> | null {
    const raw = readJson(STORAGE_KEYS.draft);
    if (raw === null) return null;
    const r = DraftShape.safeParse(raw);
    if (!r.success) {
      removeKey(STORAGE_KEYS.draft); // ERR-002-05
      return null;
    }
    return r.data;
  },
  /** Trả false nếu storage không dùng được (ERR-002-06). */
  save(d: Partial<WishDraft>): boolean {
    try {
      writeRaw(STORAGE_KEYS.draft, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  },
  clear(): void {
    removeKey(STORAGE_KEYS.draft);
  },
  /** Chỉ báo lỗi lưu nháp một lần mỗi phiên. */
  shouldWarn(): boolean {
    if (warned) return false;
    warned = true;
    return true;
  },
};
