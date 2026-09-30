import { BACKEND } from '@/shared/config/backend';
import { ownerTokens } from '../ownerTokens';
import type { Result, Wish, WishDraft } from '../types';
import { useWishStore } from '../wishStore';
import { assignRemoteSlots, rowToWish } from './assignRemoteSlots';
import { createRemoteRepository, type RemoteError, type RemoteWishRow } from './remoteRepository';

/**
 * Thao tác trên cây ước nguyện chung (007). Mọi thay đổi đi qua server;
 * store chỉ phản chiếu kết quả server trả về — không ghi localStorage (FR-007-17).
 */
const repo = BACKEND ? createRemoteRepository(BACKEND) : null;
const PAGE = 100;
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Hàng gần nhất đã tải (trang cây), giữ để gán slot lại sau mỗi thao tác. */
let treeRows: RemoteWishRow[] = [];
let olderRows: RemoteWishRow[] = [];

function applyRows(rows: RemoteWishRow[]) {
  treeRows = rows;
  useWishStore.setState({ wishes: assignRemoteSlots(rows), hydrated: true });
}

export const remoteWishes = {
  enabled: repo !== null,

  /** Tải lại 100 điều ước mới nhất (FR-007-02, FR-007-04). */
  async sync(): Promise<Result<Wish[], RemoteError>> {
    if (!repo) return { ok: false, error: 'SERVER' };
    const r = await repo.list(0, PAGE);
    if (!r.ok) return r;
    applyRows(r.value);
    const s = useWishStore.getState();
    useWishStore.setState({ hasMore: r.value.length === PAGE || s.older.length > 0 });
    return { ok: true, value: useWishStore.getState().wishes };
  },

  /** Tải thêm 100 điều ước cũ hơn cho danh sách (FR-007-14). */
  async loadMore(): Promise<Result<number, RemoteError>> {
    if (!repo) return { ok: false, error: 'SERVER' };
    const r = await repo.list(treeRows.length + olderRows.length, PAGE);
    if (!r.ok) return r;
    olderRows = [...olderRows, ...r.value];
    useWishStore.setState({ older: olderRows.map((row) => rowToWish(row, '')), hasMore: r.value.length === PAGE });
    return { ok: true, value: r.value.length };
  },

  async refreshQuota(): Promise<void> {
    if (!repo) return;
    const r = await repo.quota();
    if (r.ok) useWishStore.setState({ quota: r.value });
  },

  /** Tạo điều ước trên server rồi treo lên cây kèm animation (FR-007-06). */
  async create(draft: WishDraft, source: Wish['source'], durationMs: number): Promise<Result<Wish, RemoteError>> {
    if (!repo) return { ok: false, error: 'SERVER' };
    const token = ownerTokens.create();
    const r = await repo.create(draft, token, source);
    if (!r.ok) {
      if (r.error === 'QUOTA_EXCEEDED') {
        const q = useWishStore.getState().quota;
        useWishStore.setState({ quota: { used: q?.limit ?? 3, limit: q?.limit ?? 3, remaining: 0 } });
      }
      return r;
    }
    ownerTokens.set(r.value.wish.id, token);
    useWishStore.setState({ quota: r.value.quota });
    applyRows([r.value.wish, ...treeRows.filter((w) => w.id !== r.value.wish.id)]);
    const wish = useWishStore.getState().wishes.find((w) => w.id === r.value.wish.id);
    if (!wish) return { ok: false, error: 'BAD_RESPONSE' };
    useWishStore.setState({ animation: { wishId: wish.id, startedAt: perfNow(), durationMs } });
    return { ok: true, value: wish };
  },

  async update(id: string, draft: WishDraft): Promise<Result<Wish, RemoteError>> {
    const token = ownerTokens.get(id);
    if (!repo || !token) return { ok: false, error: 'FORBIDDEN' };
    const r = await repo.update(id, draft, token);
    if (!r.ok) return r;
    applyRows(treeRows.map((w) => (w.id === id ? r.value : w)));
    const wish = useWishStore.getState().wishes.find((w) => w.id === id) ?? rowToWish(r.value, '');
    return { ok: true, value: wish };
  },

  /** Gỡ mềm; trả về điều ước đã gỡ để hoàn tác (FR-007-13). */
  async remove(id: string): Promise<Result<Wish, RemoteError>> {
    const token = ownerTokens.get(id);
    if (!repo || !token) return { ok: false, error: 'FORBIDDEN' };
    const before = useWishStore.getState().wishes.find((w) => w.id === id);
    const r = await repo.remove(id, token);
    if (!r.ok) return r;
    applyRows(treeRows.filter((w) => w.id !== id));
    if (before) {
      useWishStore.setState((s) => ({ falling: [...s.falling, { wish: before, startedAt: perfNow() }] }));
      setTimeout(() => useWishStore.setState((s) => ({ falling: s.falling.filter((f) => f.wish.id !== id) })), 1000);
    }
    return before ? { ok: true, value: before } : { ok: false, error: 'NOT_FOUND' };
  },

  async restore(id: string): Promise<Result<Wish, RemoteError>> {
    const token = ownerTokens.get(id);
    if (!repo || !token) return { ok: false, error: 'FORBIDDEN' };
    const r = await repo.restore(id, token);
    if (!r.ok) return r;
    applyRows([...treeRows.filter((w) => w.id !== id), r.value]);
    const wish = useWishStore.getState().wishes.find((w) => w.id === id) ?? rowToWish(r.value, '');
    return { ok: true, value: wish };
  },

  /** Có quyền sửa/gỡ khi trình duyệt giữ owner token (FR-007-11). */
  canManage(id: string): boolean {
    return ownerTokens.has(id);
  },

  /** Chỉ dùng cho test. */
  _reset() {
    treeRows = [];
    olderRows = [];
  },
};
