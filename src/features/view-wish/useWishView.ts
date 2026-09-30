import { useMemo } from 'react';
import { create } from 'zustand';
import { STORAGE_KEYS, useWishStore } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { readJson, writeRaw } from '@/shared/lib/storage';
import { DEFAULT_FILTER, filterWishes, isFilterActive, WishFilterSchema, type WishFilter } from './filterWishes';

interface WishViewState {
  selectedWishId: string | null;
  drawerOpen: boolean;
  filter: WishFilter;
  select(id: string | null): void;
  openDrawer(): void;
  closeDrawer(): void;
  setFilter(p: Partial<WishFilter>): void;
  clearFilter(): void;
}

function loadFilter(): WishFilter {
  const r = WishFilterSchema.safeParse(readJson(STORAGE_KEYS.filter, 'session'));
  return r.success ? r.data : DEFAULT_FILTER; // ERR-004-03
}

function saveFilter(f: WishFilter) {
  try {
    writeRaw(STORAGE_KEYS.filter, JSON.stringify(f), 'session'); // NFR-004-06
  } catch {
    /* chỉ là tiện ích, bỏ qua */
  }
}

export const useWishViewStore = create<WishViewState>()((set, get) => ({
  selectedWishId: null,
  drawerOpen: false,
  filter: loadFilter(),
  select(id) {
    if (id === get().selectedWishId) return;
    set({ selectedWishId: id });
    if (id) events.emit('wish:selected', { wishId: id });
    else events.emit('wish:deselected', {});
  },
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  setFilter(p) {
    const filter = { ...get().filter, ...p };
    set({ filter });
    saveFilter(filter);
  },
  clearFilter() {
    const filter = { ...DEFAULT_FILTER, sort: get().filter.sort };
    set({ filter });
    saveFilter(filter);
  },
}));

/** Danh sách đã lọc + id được làm nổi bật trên cây (FR-004-09). */
export function useVisibleWishes() {
  const tree = useWishStore((s) => s.wishes);
  const older = useWishStore((s) => s.older);
  // Cây chung: danh sách gồm cả điều ước cũ không còn trên cây (FR-007-14)
  const wishes = useMemo(() => (older.length ? [...tree, ...older] : tree), [tree, older]);
  const filter = useWishViewStore((s) => s.filter);
  return useMemo(() => {
    const visibleWishes = filterWishes(wishes, filter);
    const matchedIds = isFilterActive(filter) ? new Set(visibleWishes.map((w) => w.id)) : null;
    return { visibleWishes, matchedIds };
  }, [wishes, filter]);
}
