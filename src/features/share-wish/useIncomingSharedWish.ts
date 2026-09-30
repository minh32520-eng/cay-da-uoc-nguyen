import { useEffect } from 'react';
import { create } from 'zustand';
import { remoteWishes, selectIsFull, useWishStore } from '@/entities/wish';
import { hangFromDraft, hangWishAnyMode } from '@/features/hang-wish';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { toast } from '@/shared/ui/toast';
import { decodeWish, isDuplicateOf, parseShareHash, type DecodeError, type IncomingSharedWish } from './shareCodec';

const DECODE_ERROR_TEXT: Record<DecodeError, string> = {
  TOO_LONG: vi.share.invalid,
  DECOMPRESS_FAILED: vi.share.invalid,
  BAD_JSON: vi.share.invalid,
  INVALID: vi.share.invalid,
  BAD_VERSION: vi.share.badVersion,
  PROFANITY: vi.share.profanity,
};

interface IncomingState {
  incoming: IncomingSharedWish | null;
  error: string | null;
  readFromHash(hash: string): void;
  dismiss(): void;
  /** Trả true nếu đã treo thành công. */
  accept(): Promise<boolean>;
}

/** Xoá hash mà không tải lại trang (FR-006-11). */
function clearHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${search}#/`);
}

export const useIncomingStore = create<IncomingState>()((set, get) => ({
  incoming: null,
  error: null,

  readFromHash(hash) {
    const payload = parseShareHash(hash);
    if (payload === null) {
      set({ incoming: null });
      return;
    }
    const r = decodeWish(payload);
    if (!r.ok) {
      // Link hỏng: mở cây bình thường + báo lỗi (FR-006-12)
      set({ incoming: null, error: DECODE_ERROR_TEXT[r.error] });
      toast(DECODE_ERROR_TEXT[r.error], { tone: 'error' });
      clearHash();
      return;
    }
    set({ incoming: r.value, error: null });
    events.emit('share:opened', {});
  },

  dismiss() {
    set({ incoming: null });
    clearHash();
  },

  async accept() {
    const incoming = get().incoming;
    if (!incoming) return false;
    const store = useWishStore.getState();
    if (remoteWishes.enabled) {
      // Cây chung: trùng khi đã có điều ước cùng nội dung & tên; tạo mới tính vào 3 lượt (FR-007-16)
      const dup = [...store.wishes, ...store.older].some(
        (w) => w.content === incoming.draft.content && w.author === incoming.draft.author,
      );
      if (dup) {
        toast(vi.share.duplicate);
        return false;
      }
      const r = await hangWishAnyMode(incoming.draft, { source: 'shared' });
      if (r.ok) {
        events.emit('share:accepted', { wish: r.wish });
        get().dismiss();
      }
      return r.ok;
    }
    if (isDuplicateOf(incoming, store.wishes)) {
      toast(vi.share.duplicate); // ERR-006-08
      return false;
    }
    if (selectIsFull(store)) {
      toast(vi.share.treeFull, { tone: 'error' }); // ERR-006-07
      return false;
    }
    const r = hangFromDraft(incoming.draft, { source: 'shared', createdAt: incoming.originalCreatedAt });
    if (r.ok) {
      events.emit('share:accepted', { wish: r.wish });
      get().dismiss();
    }
    return r.ok;
  },
}));

/** Đọc `#/w/<payload>` khi mở trang và khi hash đổi (FR-006-07). */
export function useIncomingSharedWish() {
  useEffect(() => {
    const read = () => useIncomingStore.getState().readFromHash(window.location.hash);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
}
