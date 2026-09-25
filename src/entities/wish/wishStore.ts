import { create } from 'zustand';
import { BRANCH_SLOTS, getSlotById } from '@/scene/branchSlots';
import type { BranchSlot } from '@/scene/types';
import { removeKey } from '@/shared/lib/storage';
import { MAX_WISHES, STORAGE_KEYS, UNDO_MS } from './constants';
import { validateDraft } from './schema';
import { pickSlot } from './slotAllocator';
import type {
  HangResult,
  ImportMode,
  ImportPreview,
  Result,
  UndoEntry,
  Wish,
  WishDraft,
} from './types';
import { wishRepository } from './wishRepository';

export interface HangingAnimation {
  wishId: string;
  startedAt: number; // performance.now()
  durationMs: number;
}

export interface FallingWish {
  wish: Wish;
  startedAt: number;
}

export interface HangOptions {
  slotId?: string;
  source?: Wish['source'];
  createdAt?: string;
  durationMs?: number;
}

interface WishState {
  wishes: Wish[];
  hydrated: boolean;
  /** false khi lần ghi gần nhất thất bại (ERR-003-03). */
  persisted: boolean;
  /** Dữ liệu cũ hỏng khi nạp (ERR-003-05). */
  corruptedOnLoad: boolean;
  animation: HangingAnimation | null;
  falling: FallingWish[];

  hydrate(): void;
  hangWish(draft: WishDraft, opts?: HangOptions): HangResult;
  updateWish(id: string, draft: WishDraft): Result<Wish, 'NOT_FOUND' | 'INVALID_DRAFT'>;
  removeWish(id: string): Result<UndoEntry, 'NOT_FOUND'>;
  restoreWish(entry: UndoEntry): Result<{ wish: Wish; moved: boolean }, 'EXPIRED' | 'TREE_FULL'>;
  clearAll(): void;
  importWishes(
    preview: ImportPreview,
    mode: ImportMode,
  ): Result<{ added: number; skipped: number }, 'STORAGE_FAILED'>;
  finishAnimation(): void;
}

const now = () => new Date().toISOString();
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function freeSlotsOf(wishes: readonly Wish[]): BranchSlot[] {
  const used = new Set(wishes.map((w) => w.slotId));
  return BRANCH_SLOTS.filter((s) => !used.has(s.id));
}

/**
 * Mỗi slot tối đa 1 wish: bản ghi sớm hơn giữ slot, bản sau được chuyển sang
 * slot trống; slotId không tồn tại cũng được gán lại (FR-003-11, ERR-003-06).
 */
export function resolveSlotConflicts(wishes: readonly Wish[], rnd: () => number = Math.random): Wish[] {
  const sorted = [...wishes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const used = new Set<string>();
  const kept: Wish[] = [];
  const homeless: Wish[] = [];
  for (const w of sorted) {
    if (getSlotById(w.slotId) && !used.has(w.slotId)) {
      used.add(w.slotId);
      kept.push(w);
    } else {
      homeless.push(w);
    }
  }
  for (const w of homeless) {
    const slot = pickSlot(
      BRANCH_SLOTS.filter((s) => !used.has(s.id)),
      rnd,
    );
    if (!slot) break;
    used.add(slot.id);
    kept.push({ ...w, slotId: slot.id });
  }
  return kept;
}

function tryPersist(wishes: Wish[]): boolean {
  try {
    wishRepository.save(wishes);
    return true;
  } catch {
    return false;
  }
}

export const useWishStore = create<WishState>()((set, get) => ({
  wishes: [],
  hydrated: false,
  persisted: true,
  corruptedOnLoad: false,
  animation: null,
  falling: [],

  hydrate() {
    const { wishes, corrupted } = wishRepository.load();
    const resolved = resolveSlotConflicts(wishes);
    const changed =
      resolved.length !== wishes.length ||
      resolved.some((w) => wishes.find((o) => o.id === w.id)?.slotId !== w.slotId);
    if (changed) tryPersist(resolved);
    set({ wishes: resolved, hydrated: true, corruptedOnLoad: corrupted });
  },

  hangWish(draft, opts = {}) {
    const parsed = validateDraft(draft);
    if (!parsed.ok) return { ok: false, error: 'INVALID_DRAFT' };

    const { wishes } = get();
    if (wishes.length >= MAX_WISHES) return { ok: false, error: 'TREE_FULL' };

    let slot: BranchSlot | null | undefined;
    if (opts.slotId) {
      slot = getSlotById(opts.slotId);
      if (!slot || wishes.some((w) => w.slotId === opts.slotId)) {
        return { ok: false, error: 'SLOT_TAKEN' };
      }
    } else {
      slot = pickSlot(freeSlotsOf(wishes));
    }
    if (!slot) return { ok: false, error: 'TREE_FULL' };

    const ts = now();
    const wish: Wish = {
      ...parsed.data,
      id: crypto.randomUUID(),
      slotId: slot.id,
      source: opts.source ?? 'local',
      createdAt: opts.createdAt ?? ts,
      updatedAt: ts,
    };
    const next = [...wishes, wish];
    const persisted = tryPersist(next);
    set({
      wishes: next,
      persisted,
      animation: { wishId: wish.id, startedAt: perfNow(), durationMs: opts.durationMs ?? 2200 },
    });
    return { ok: true, wish, persisted };
  },

  updateWish(id, draft) {
    const current = get().wishes.find((w) => w.id === id);
    if (!current) return { ok: false, error: 'NOT_FOUND' };
    const parsed = validateDraft(draft);
    if (!parsed.ok) return { ok: false, error: 'INVALID_DRAFT' };
    // Giữ nguyên id, slotId, createdAt, source (FR-005-03)
    const updated: Wish = { ...current, ...parsed.data, updatedAt: now() };
    const next = get().wishes.map((w) => (w.id === id ? updated : w));
    set({ wishes: next, persisted: tryPersist(next) });
    return { ok: true, value: updated };
  },

  removeWish(id) {
    const wish = get().wishes.find((w) => w.id === id);
    if (!wish) return { ok: false, error: 'NOT_FOUND' };
    const next = get().wishes.filter((w) => w.id !== id);
    const falling = [...get().falling, { wish, startedAt: perfNow() }];
    set({ wishes: next, persisted: tryPersist(next), falling });
    setTimeout(() => {
      set((s) => ({ falling: s.falling.filter((f) => f.wish.id !== id) }));
    }, 1000);
    return { ok: true, value: { wish, expiresAt: Date.now() + UNDO_MS } };
  },

  restoreWish(entry) {
    if (Date.now() > entry.expiresAt) return { ok: false, error: 'EXPIRED' };
    const { wishes } = get();
    if (wishes.length >= MAX_WISHES) return { ok: false, error: 'TREE_FULL' };
    let wish = entry.wish;
    let moved = false;
    if (wishes.some((w) => w.slotId === wish.slotId)) {
      const slot = pickSlot(freeSlotsOf(wishes));
      if (!slot) return { ok: false, error: 'TREE_FULL' };
      wish = { ...wish, slotId: slot.id };
      moved = true;
    }
    const next = [...wishes, wish];
    set({ wishes: next, persisted: tryPersist(next) });
    return { ok: true, value: { wish, moved } };
  },

  clearAll() {
    wishRepository.snapshot(get().wishes);
    removeKey(STORAGE_KEYS.draft);
    set({ wishes: [], persisted: tryPersist([]), animation: null });
  },

  importWishes(preview, mode) {
    const current = mode === 'merge' ? get().wishes : [];
    const room = MAX_WISHES - current.length;
    const newestFirst = [...preview.valid].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const accepted = newestFirst.slice(0, Math.max(0, room));

    // Bản ghi hiện có giữ slot; bản nhập trùng slot được chuyển chỗ
    const used = new Set(current.map((w) => w.slotId));
    const placed: Wish[] = [];
    const homeless: Wish[] = [];
    for (const w of [...accepted].reverse()) {
      if (getSlotById(w.slotId) && !used.has(w.slotId)) {
        used.add(w.slotId);
        placed.push(w);
      } else homeless.push(w);
    }
    for (const w of homeless) {
      const slot = pickSlot(BRANCH_SLOTS.filter((s) => !used.has(s.id)));
      if (!slot) break;
      used.add(slot.id);
      placed.push({ ...w, slotId: slot.id });
    }

    const next = [...current, ...placed];
    if (mode === 'replace') wishRepository.snapshot(get().wishes);
    // Nguyên tử: chỉ cập nhật state khi ghi thành công (NFR-005-01)
    if (!tryPersist(next)) return { ok: false, error: 'STORAGE_FAILED' };
    set({ wishes: next, persisted: true });
    return { ok: true, value: { added: placed.length, skipped: preview.valid.length - placed.length } };
  },

  finishAnimation() {
    set({ animation: null });
  },
}));

export const selectIsFull = (s: WishState) => s.wishes.length >= MAX_WISHES;
