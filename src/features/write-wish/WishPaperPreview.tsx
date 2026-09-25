import { DEFAULT_AUTHOR, PAPER_HEX, PAPER_INK, type WishDraft } from '@/entities/wish';
import { vi } from '@/shared/i18n/vi';
import { CategoryIcon } from '@/shared/ui/icons';

const SIZES = {
  sm: 'w-28 min-h-40 text-xs p-3',
  md: 'w-44 min-h-60 text-sm p-4',
  lg: 'w-60 min-h-80 text-base p-5',
};

/**
 * Tờ giấy ước nguyện dạng 2D. Nội dung hiển thị bằng text node React
 * nên luôn được escape (FR-002-09, NFR-002-04).
 */
export function WishPaperPreview({ draft, size = 'md' }: { draft: Partial<WishDraft>; size?: keyof typeof SIZES }) {
  const color = draft.paperColor ?? 'red';
  const category = draft.category ?? 'other';
  return (
    <figure
      aria-label={vi.compose.preview}
      className={`relative mx-auto flex flex-col rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${SIZES[size]}`}
      style={{ backgroundColor: PAPER_HEX[color], color: PAPER_INK[color] }}
    >
      <span aria-hidden className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-red-700" />
      <span aria-hidden className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-red-800" />
      <span className="mb-2 flex justify-center opacity-80">
        <CategoryIcon category={category} size={22} />
      </span>
      <p className="font-hand flex-1 whitespace-pre-wrap break-words text-center leading-relaxed">
        {draft.content?.trim() || '…'}
      </p>
      <figcaption className="mt-3 text-right text-[0.85em] italic opacity-80">
        — {draft.author?.trim() || DEFAULT_AUTHOR}
      </figcaption>
    </figure>
  );
}
