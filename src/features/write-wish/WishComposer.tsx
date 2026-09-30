import { useEffect, useId, useRef, useState } from 'react';
import {
  getSuggestion,
  MAX_CONTENT,
  PAPER_COLORS,
  PAPER_HEX,
  WISH_CATEGORIES,
  type DraftIssue,
  type WishDraft,
} from '@/entities/wish';
import { vi } from '@/shared/i18n/vi';
import { Modal } from '@/shared/ui/Modal';
import { toast } from '@/shared/ui/toast';
import { CategoryIcon, OrnamentIcon, SparkleIcon } from '@/shared/ui/icons';
import { draftStorage } from './draftStorage';
import { useWishForm } from './useWishForm';
import { WishPaperPreview } from './WishPaperPreview';

export interface SubmitOptions {
  pickSlot: boolean;
}

interface WishComposerProps {
  open: boolean;
  onClose: () => void;
  /** Trả true (hoặc Promise<true>) nếu gửi thành công để form xoá bản nháp và đóng. */
  onSubmit: (draft: WishDraft, opts: SubmitOptions) => boolean | Promise<boolean>;
  initialValue?: Partial<WishDraft>;
  mode?: 'create' | 'edit';
  /** Chế độ cây chung (007): lượt còn lại của IP; null = không giới hạn (local). */
  quota?: { remaining: number; limit: number } | null;
  /** Cho phép "Tự chọn cành" (FR-003-04) — tắt ở chế độ cây chung. */
  allowPickSlot?: boolean;
}

const CONTENT_ERR: Record<DraftIssue, string> = {
  EMPTY: vi.compose.errEmpty,
  TOO_LONG: vi.compose.errTooLong,
  PROFANITY: vi.compose.errProfanity,
};
const AUTHOR_ERR: Record<DraftIssue, string> = {
  EMPTY: '',
  TOO_LONG: vi.compose.errAuthorTooLong,
  PROFANITY: vi.compose.errProfanity,
};

/** Modal soạn / sửa ước nguyện (feature 002, dùng lại ở 005). */
export function WishComposer({ open, onClose, onSubmit, initialValue, mode = 'create', quota = null, allowPickSlot = true }: WishComposerProps) {
  const form = useWishForm(initialValue);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [pickSlot, setPickSlot] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const outOfQuota = mode === 'create' && quota !== null && quota.remaining <= 0;
  const ids = { content: useId(), contentErr: useId(), author: useId(), authorErr: useId(), counter: useId() };
  const { reset } = form;

  // Mở form: khôi phục bản nháp (create) hoặc dữ liệu cũ (edit) (FR-002-12)
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') reset(draftStorage.load() ?? {});
    else reset(initialValue ?? {});
    setConfirmClose(false);
  }, [open, mode, initialValue, reset]);

  // Tự lưu nháp sau 500 ms không gõ (FR-002-11)
  useEffect(() => {
    if (!open || mode !== 'create' || !form.isDirty) return;
    const t = window.setTimeout(() => {
      if (!draftStorage.save(form.values) && draftStorage.shouldWarn()) toast(vi.compose.errDraftStorage);
    }, 500);
    return () => window.clearTimeout(t);
  }, [open, mode, form.isDirty, form.values]);

  const requestClose = () => {
    if (form.isDirty && mode === 'create') setConfirmClose(true);
    else onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || outOfQuota) return;
    const draft = form.submit();
    if (!draft) return;
    setSubmitting(true);
    try {
      // Server lỗi / hết lượt → giữ nguyên bản nháp (FR-007-08, ERR-007-02)
      if (await onSubmit(draft, { pickSlot: mode === 'create' && allowPickSlot && pickSlot })) {
        if (mode === 'create') draftStorage.clear();
        form.reset();
        setPickSlot(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const contentError = form.errors.content ? CONTENT_ERR[form.errors.content] : null;
  const authorError = form.errors.author ? AUTHOR_ERR[form.errors.author] : null;
  const nearLimit = form.contentLength >= MAX_CONTENT;

  return (
    <Modal
      open={open}
      title={mode === 'create' ? vi.compose.titleCreate : vi.compose.titleEdit}
      onClose={requestClose}
      initialFocusRef={contentRef}
      className="sm:max-w-3xl"
    >
      {confirmClose ? (
        <div role="alertdialog" aria-label={vi.compose.discardTitle} className="space-y-4">
          <p>{vi.compose.discardTitle}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                draftStorage.clear();
                form.reset();
                onClose();
              }}
            >
              {vi.compose.discardDraft}
            </button>
            <button
              type="button"
              className="btn-primary"
              autoFocus
              onClick={() => {
                draftStorage.save(form.values);
                onClose();
              }}
            >
              {vi.compose.keepDraft}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-end justify-between">
                <label htmlFor={ids.content} className="label">
                  {vi.compose.content} <span aria-hidden className="text-red-300">*</span>
                </label>
                <span id={ids.counter} className={`text-xs ${nearLimit ? 'text-red-300' : 'text-amber-100/70'}`}>
                  {form.contentLength}/{MAX_CONTENT}
                </span>
              </div>
              <textarea
                id={ids.content}
                ref={contentRef}
                className="field min-h-28 resize-y"
                placeholder={vi.compose.contentPlaceholder}
                value={form.values.content}
                onChange={(e) => form.setField('content', e.target.value)}
                onBlur={form.touchContent}
                aria-required="true"
                aria-invalid={!!contentError}
                aria-describedby={`${ids.counter}${contentError ? ` ${ids.contentErr}` : ''}`}
              />
              <p id={ids.contentErr} aria-live="polite" className="mt-1 min-h-5 text-sm text-red-300">
                {contentError}
              </p>
              <button
                type="button"
                className="btn-ghost text-sm text-amber-300"
                onClick={() => form.setField('content', getSuggestion(form.values.category))}
              >
                <SparkleIcon size={16} className="mr-1 inline" /> {vi.compose.suggest}
              </button>
            </div>

            <div>
              <label htmlFor={ids.author} className="label mb-1 block">
                {vi.compose.author}
              </label>
              <input
                id={ids.author}
                className="field"
                placeholder={vi.compose.authorPlaceholder}
                value={form.values.author}
                onChange={(e) => form.setField('author', e.target.value)}
                aria-invalid={!!authorError}
                aria-describedby={authorError ? ids.authorErr : undefined}
                autoComplete="nickname"
              />
              <p id={ids.authorErr} aria-live="polite" className="mt-1 min-h-5 text-sm text-red-300">
                {authorError}
              </p>
            </div>

            <fieldset>
              <legend className="label mb-2">{vi.compose.category}</legend>
              <div className="flex flex-wrap gap-2">
                {WISH_CATEGORIES.map((c) => (
                  <label key={c} className="chip">
                    <input
                      type="radio"
                      name="category"
                      className="sr-only"
                      checked={form.values.category === c}
                      onChange={() => form.setField('category', c)}
                    />
                    <CategoryIcon category={c} size={16} /> {vi.categories[c]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label mb-2">{vi.compose.paperColor}</legend>
              <div className="flex flex-wrap gap-3">
                {PAPER_COLORS.map((c) => (
                  <label key={c} className="swatch" title={vi.colors[c]}>
                    <input
                      type="radio"
                      name="paperColor"
                      className="peer sr-only"
                      checked={form.values.paperColor === c}
                      onChange={() => form.setField('paperColor', c)}
                    />
                    <span
                      className="block h-9 w-9 rounded-full border-2 border-transparent peer-checked:border-amber-100 peer-checked:ring-2 peer-checked:ring-amber-300 peer-focus-visible:ring-2 peer-focus-visible:ring-white"
                      style={{ backgroundColor: PAPER_HEX[c] }}
                    />
                    <span className="sr-only">{vi.colors[c]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === 'create' && allowPickSlot && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pickSlot} onChange={(e) => setPickSlot(e.target.checked)} className="h-4 w-4 accent-amber-400" />
                {vi.compose.pickSlot}
              </label>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-6 pt-6">
            <WishPaperPreview draft={form.values} />
            <div className="w-full space-y-2">
              {mode === 'create' && quota && (
                <div className="space-y-1 text-center text-xs" aria-live="polite">
                  <p className={outOfQuota ? 'font-semibold text-red-300' : 'text-amber-200'}>
                    {outOfQuota ? vi.remote.quotaExceeded : vi.remote.quota(quota.remaining, quota.limit)}
                  </p>
                  <p className="text-amber-100/70">{vi.remote.publicNotice}</p>
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={!form.isValid || submitting || outOfQuota}>
                <OrnamentIcon /> {submitting ? vi.remote.sending : mode === 'create' ? vi.compose.submitCreate : vi.compose.submitEdit}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
