import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Wish } from '@/entities/wish';
import { WishPaperPreview } from '@/features/write-wish';
import { vi } from '@/shared/i18n/vi';
import { CategoryIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, LinkIcon } from '@/shared/ui/icons';
import { formatWishDate } from './filterWishes';

interface WishDetailCardProps {
  wish: Wish;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /** Chỗ gắn nút Sửa/Gỡ (005) và Chia sẻ (006). */
  actions?: ReactNode;
}

/** Thẻ chi tiết ước nguyện, không che cảnh cây (FR-004-02..04, FR-004-15). */
export function WishDetailCard({ wish, onPrev, onNext, onClose, actions }: WishDetailCardProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Không cướp phím khi đang có modal khác mở
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && ref.current?.contains(document.activeElement)) onPrev();
      else if (e.key === 'ArrowRight' && ref.current?.contains(document.activeElement)) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-labelledby={titleId}
      className="pointer-events-auto w-full max-w-sm rounded-2xl border border-amber-200/25 bg-night-900/95 p-4 text-amber-50 shadow-2xl outline-none backdrop-blur animate-rise"
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 id={titleId} className="font-display text-lg text-amber-200">
            {wish.author}
          </h2>
          <p className="flex flex-wrap items-center gap-1 text-xs text-amber-100/70">
            <CategoryIcon category={wish.category} size={14} /> {vi.categories[wish.category]} · {vi.colors[wish.paperColor]} ·{' '}
            {vi.view.hungOn} {formatWishDate(wish.createdAt)}
          </p>
          {wish.source === 'shared' && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2 py-0.5 text-xs text-sky-200">
              <LinkIcon size={12} /> {vi.view.shared}
            </span>
          )}
        </div>
        <button type="button" className="btn-icon" aria-label={vi.compose.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className="py-2">
        <WishPaperPreview draft={wish} size="md" />
      </div>
      <p className="sr-only">{wish.content}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" className="btn-secondary px-3" onClick={onPrev} aria-label={vi.view.prev}>
          <ChevronLeftIcon size={18} /> {vi.view.prev}
        </button>
        <button type="button" className="btn-secondary px-3" onClick={onNext} aria-label={vi.view.next}>
          {vi.view.next} <ChevronRightIcon size={18} />
        </button>
      </div>
      {actions && <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-amber-100/10 pt-3">{actions}</div>}
    </section>
  );
}
