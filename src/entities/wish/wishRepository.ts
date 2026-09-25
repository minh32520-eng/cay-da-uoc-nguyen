import { readJson, readRaw, writeRaw } from '@/shared/lib/storage';
import { STORAGE_KEYS } from './constants';
import { parseWishList, WishStorageSchema } from './schema';
import type { Wish, WishStorageV1 } from './types';

export interface LoadResult {
  wishes: Wish[];
  /** Dữ liệu gốc hỏng và đã được sao lưu (ERR-003-05). */
  corrupted: boolean;
  invalidCount: number;
}

function backupRaw(raw: string): void {
  try {
    writeRaw(STORAGE_KEYS.backup, raw);
  } catch {
    /* không sao lưu được thì thôi, vẫn khởi tạo rỗng */
  }
}

export const wishRepository = {
  load(): LoadResult {
    const json = readJson(STORAGE_KEYS.wishes);
    if (json === null) return { wishes: [], corrupted: false, invalidCount: 0 };

    const envelope = json === undefined ? null : WishStorageSchema.safeParse(json);
    if (!envelope?.success) {
      const raw = readRaw(STORAGE_KEYS.wishes);
      if (raw) backupRaw(raw);
      return { wishes: [], corrupted: true, invalidCount: 0 };
    }

    const { wishes, invalid } = parseWishList(envelope.data.wishes);
    if (invalid > 0) console.warn(`[wishRepository] Bỏ qua ${invalid} bản ghi không hợp lệ.`);
    return { wishes, corrupted: false, invalidCount: invalid };
  },

  /** Ném StorageError khi không ghi được. */
  save(wishes: Wish[]): void {
    const data: WishStorageV1 = { version: 1, wishes };
    writeRaw(STORAGE_KEYS.wishes, JSON.stringify(data));
  },

  /** Sao lưu trước thao tác phá huỷ (FR-005-13). */
  snapshot(wishes: Wish[]): void {
    const data: WishStorageV1 = { version: 1, wishes };
    backupRaw(JSON.stringify(data));
  },

  /** Đồng bộ giữa các tab (FR-003-15). */
  subscribe(cb: () => void): () => void {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.wishes || e.key === null) cb();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};
