import { useCallback, useMemo, useState } from 'react';
import {
  MAX_AUTHOR,
  MAX_CONTENT,
  validateDraft,
  type DraftErrors,
  type WishDraft,
} from '@/entities/wish';
import { graphemeLength, truncateGraphemes } from '@/shared/lib/text';

export const EMPTY_DRAFT: WishDraft = { content: '', author: '', category: 'other', paperColor: 'red' };

const LIMITS: Partial<Record<keyof WishDraft, number>> = { content: MAX_CONTENT, author: MAX_AUTHOR };

/** Trạng thái form soạn ước nguyện (002 §6). */
export function useWishForm(initial?: Partial<WishDraft>) {
  const start = useMemo(() => ({ ...EMPTY_DRAFT, ...initial }), [initial]);
  const [values, setValues] = useState<WishDraft>(start);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isDirty, setDirty] = useState(false);

  const setField = useCallback(<K extends keyof WishDraft>(key: K, value: WishDraft[K]) => {
    const limit = LIMITS[key];
    // Chặn nhập vượt giới hạn (ERR-002-02/03)
    const next = (limit !== undefined && typeof value === 'string' && graphemeLength(value) > limit
      ? truncateGraphemes(value, limit)
      : value) as WishDraft[K];
    setValues((v) => ({ ...v, [key]: next }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDirty(true);
  }, []);

  /** Kiểm tra riêng ô nội dung khi rời ô (FR-002-07). */
  const touchContent = useCallback(() => {
    if (values.content.trim().length === 0) setErrors((e) => ({ ...e, content: 'EMPTY' }));
  }, [values.content]);

  const submit = useCallback((): WishDraft | null => {
    const r = validateDraft(values);
    if (!r.ok) {
      setErrors(r.errors);
      return null;
    }
    return r.data;
  }, [values]);

  const reset = useCallback((to: Partial<WishDraft> = {}) => {
    setValues({ ...EMPTY_DRAFT, ...to });
    setErrors({});
    setDirty(false);
  }, []);

  return {
    values,
    errors,
    isValid: values.content.trim().length > 0,
    isDirty,
    contentLength: graphemeLength(values.content),
    setField,
    touchContent,
    submit,
    reset,
  };
}
