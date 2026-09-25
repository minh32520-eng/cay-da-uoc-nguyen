export const WISH_CATEGORIES = ['family', 'study', 'health', 'love', 'career', 'other'] as const;
export type WishCategory = (typeof WISH_CATEGORIES)[number];

export const PAPER_COLORS = ['red', 'yellow', 'pink', 'green', 'blue'] as const;
export type PaperColor = (typeof PAPER_COLORS)[number];

/** Dữ liệu do form sinh ra — chưa gắn vào cây (002 §5). */
export interface WishDraft {
  content: string;
  author: string;
  category: WishCategory;
  paperColor: PaperColor;
}

/** Ước nguyện đã treo (002 §5). */
export interface Wish extends WishDraft {
  id: string;
  slotId: string;
  source: 'local' | 'shared';
  createdAt: string;
  updatedAt: string;
}

export interface WishStorageV1 {
  version: 1;
  wishes: Wish[];
}

export interface WishExportV1 {
  app: 'cay-da-uoc-nguyen';
  version: 1;
  exportedAt: string;
  wishes: Wish[];
}

export type HangError = 'TREE_FULL' | 'SLOT_TAKEN' | 'INVALID_DRAFT' | 'STORAGE_FAILED';
export type HangResult =
  | { ok: true; wish: Wish; persisted: boolean }
  | { ok: false; error: HangError };

export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

export type ImportMode = 'merge' | 'replace';

export interface ImportPreview {
  valid: Wish[];
  duplicateIds: string[];
  invalidCount: number;
  overflowCount: number;
}

export interface UndoEntry {
  wish: Wish;
  expiresAt: number;
}
