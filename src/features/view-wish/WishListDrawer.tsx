import { useEffect, useState } from 'react';
import {
  PAPER_COLORS,
  PAPER_HEX,
  useWishStore,
  WISH_CATEGORIES,
  type Wish,
} from '@/entities/wish';
import { vi } from '@/shared/i18n/vi';
import { Modal } from '@/shared/ui/Modal';
import { CategoryIcon, LanternIcon, LinkIcon } from '@/shared/ui/icons';
import { formatWishDate, isFilterActive, MAX_QUERY, type WishSortOrder } from './filterWishes';
import { useVisibleWishes, useWishViewStore } from './useWishView';

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

interface WishListDrawerProps {
  onSelect: (wishId: string) => void;
  onCompose: () => void;
}

/** Danh sách ước nguyện có tìm kiếm, lọc, sắp xếp (FR-004-05..12). */
export function WishListDrawer({ onSelect, onCompose }: WishListDrawerProps) {
  const open = useWishViewStore((s) => s.drawerOpen);
  const close = useWishViewStore((s) => s.closeDrawer);
  const filter = useWishViewStore((s) => s.filter);
  const setFilter = useWishViewStore((s) => s.setFilter);
  const clearFilter = useWishViewStore((s) => s.clearFilter);
  const total = useWishStore((s) => s.wishes.length);
  const { visibleWishes } = useVisibleWishes();
  const [query, setQuery] = useState(filter.query);

  // Debounce 200 ms (FR-004-06)
  useEffect(() => {
    if (query === filter.query) return;
    const t = window.setTimeout(() => setFilter({ query }), 200);
    return () => window.clearTimeout(t);
  }, [query, filter.query, setFilter]);

  useEffect(() => setQuery(filter.query), [filter.query]);

  return (
    <Modal open={open} title={vi.view.listTitle} onClose={close} variant="drawer">
      {total === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <LanternIcon size={56} className="text-amber-300" />
          <p>{vi.view.emptyTree}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              close();
              onCompose();
            }}
          >
            {vi.compose.open}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="search"
            className="field"
            placeholder={vi.view.search}
            aria-label={vi.view.search}
            maxLength={MAX_QUERY}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="wish-sort" className="label">
              {vi.view.sort}
            </label>
            <select
              id="wish-sort"
              className="field w-auto py-1.5"
              value={filter.sort}
              onChange={(e) => setFilter({ sort: e.target.value as WishSortOrder })}
            >
              <option value="newest">{vi.view.sortNewest}</option>
              <option value="oldest">{vi.view.sortOldest}</option>
              <option value="author-asc">{vi.view.sortAuthor}</option>
            </select>
          </div>

          <fieldset>
            <legend className="label mb-1.5">{vi.view.filterCategory}</legend>
            <div className="flex flex-wrap gap-1.5">
              {WISH_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filter.categories.includes(c)}
                  className="chip"
                  onClick={() => setFilter({ categories: toggle(filter.categories, c) })}
                >
                  <CategoryIcon category={c} size={16} /> {vi.categories[c]}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={filter.sources.includes('shared')}
                className="chip"
                onClick={() => setFilter({ sources: toggle(filter.sources, 'shared') })}
              >
                <LinkIcon size={16} /> {vi.view.shared}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-1.5">{vi.view.filterColor}</legend>
            <div className="flex flex-wrap gap-2">
              {PAPER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filter.paperColors.includes(c)}
                  aria-label={vi.colors[c]}
                  title={vi.colors[c]}
                  className="h-8 w-8 rounded-full border-2 border-transparent aria-pressed:border-amber-100 aria-pressed:ring-2 aria-pressed:ring-amber-300"
                  style={{ backgroundColor: PAPER_HEX[c] }}
                  onClick={() => setFilter({ paperColors: toggle(filter.paperColors, c) })}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between text-sm">
            <p aria-live="polite" className="text-amber-100/80">
              {vi.view.results(visibleWishes.length)}
            </p>
            {isFilterActive(filter) && (
              <button type="button" className="btn-ghost text-amber-300" onClick={clearFilter}>
                {vi.view.clearFilter}
              </button>
            )}
          </div>

          {visibleWishes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-amber-100/80">
              <p>{vi.view.empty}</p>
              <button type="button" className="btn-secondary" onClick={clearFilter}>
                {vi.view.clearFilter}
              </button>
            </div>
          ) : (
            <ul role="list" className="space-y-2">
              {visibleWishes.map((w) => (
                <li key={w.id}>
                  <WishListItem wish={w} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

function WishListItem({ wish, onSelect }: { wish: Wish; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-label={vi.view.itemLabel(wish.author, wish.content)}
      onClick={() => onSelect(wish.id)}
      className="flex w-full gap-3 rounded-xl border border-amber-100/10 bg-night-800/70 p-3 text-left transition hover:border-amber-300/50 hover:bg-night-800 focus-visible:outline-2 focus-visible:outline-amber-300"
    >
      <span aria-hidden className="mt-1 h-10 w-7 shrink-0 rounded-sm shadow" style={{ backgroundColor: PAPER_HEX[wish.paperColor] }} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-sm">{wish.content}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-amber-100/60">
          <CategoryIcon category={wish.category} size={14} /> {wish.author} · {formatWishDate(wish.createdAt)}
          {wish.source === 'shared' && (
            <>
              · <LinkIcon size={13} /> {vi.view.shared}
            </>
          )}
        </span>
      </span>
    </button>
  );
}
